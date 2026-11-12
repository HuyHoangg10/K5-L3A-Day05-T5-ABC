"use strict";
/**
 * Trợ lý chat ví điện tử khi giao dịch bị tạm chặn (T5) — S03 viện phí gấp, S08 người thân đòi khoá ví.
 * Dữ liệu dựng. Không backend thật. API key đọc từ biến môi trường / .env, KHÔNG nằm trong code.
 * Chạy: node server.js  (Node >= 18)
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

// ---- đọc .env (không cần thư viện) ----
try {
  for (const line of fs
    .readFileSync(path.join(__dirname, ".env"), "utf8")
    .split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]])
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch (e) {
  /* không có .env thì dùng biến môi trường */
}

// Ưu tiên OpenAI nếu có OPENAI_API_KEY; không thì dùng Anthropic.
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const PROVIDER = OPENAI_KEY ? "openai" : "anthropic";
const API_KEY = OPENAI_KEY || ANTHROPIC_KEY;
const MODEL =
  PROVIDER === "openai"
    ? process.env.OPENAI_MODEL || "gpt-4o-mini"
    : process.env.CLAUDE_MODEL || "claude-sonnet-5-5";
const PORT = Number(process.env.PORT || 3000);

// ---- dữ liệu dựng ----
const TXN = {
  s03: {
    id: "GD-1024",
    mo_ta: 'Thanh toán viện phí 2.400.000đ cho "Bệnh viện Demo" (dữ liệu dựng)',
  },
  s08: {
    id: "GD-2077",
    mo_ta: "Chuyển 15.000.000đ tới tài khoản cá nhân lạ (dữ liệu dựng)",
  },
  free: {
    id: "GD-3001",
    mo_ta: "Thanh toán vé máy bay 6.200.000đ lúc 23:50 (dữ liệu dựng)",
  },
};
const NHOM = [
  "lua_dao_dang_dien_ra",
  "gap_that",
  "chiem_tai_khoan",
  "da_xong_khieu_nai",
  "mo_ho",
];
const TOOL_ORDER = [
  "giu_giao_dich",
  "yeu_cau_xac_minh",
  "khoa_vi",
  "soan_ho_so_chuyen",
  "chuyen_tu_van_vien",
  "nha_giao_dich",
];

const sessions = new Map();
const cases = [];
let caseSeq = 1;

function newState(id, scn, txnState, may) {
  const base = TXN[scn] || TXN.free;
  return {
    id,
    scenario: scn,
    may: may === "may_khac" ? "may_khac" : "chu_vi",
    txn: {
      id: base.id,
      mo_ta: base.mo_ta,
      trang_thai: txnState === "da_hoan_tat" ? "da_hoan_tat" : "dang_giu",
    },
    history: [],
    thao_tung: false,
    chiem_nghi: false,
    luot_mo_ho: 0,
    xac_minh_da_gui: false,
    vi_khoa: false,
    cho_khoa: false,
    case_id: null,
    outbox: [],
  };
}

// ---- giờ trực (Asia/Ho_Chi_Minh) ----
function gioHienTai() {
  const s = new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const h = Number(s.split(":")[0]);
  return { text: s, truc: h >= 8 && h < 20 };
}

// ---- tầng 1: phát hiện thao túng bằng từ khoá (không phụ thuộc model) ----
const RE_THAO_TUNG =
  /(vụ án|công an|cơ quan điều tra|viện kiểm sát|tòa án|toà án|xác minh hồ sơ|tài khoản an toàn|tài khoản giám sát|phong tỏa|phong toả|không được nói với ai|có người gọi|bị gọi|người lạ gọi|gọi điện dọa|gọi điện doạ|bị doạ|bị dọa|bảo (tôi|mình|em|mẹ|bố|ba) chuyển)/i;
const RE_CHIEM =
  /(đổi mật khẩu|máy lạ|thiết bị lạ|đăng nhập lạ|không phải (tôi|mình|em) đăng nhập|mất sim|bị hack|bị chiếm)/i;

// ---- system prompt ----
function buildSystem(st) {
  const g = gioHienTai();
  return `Bạn là trợ lý chat AI trong ví điện tử, nói chuyện với người dùng đang lo lắng vì giao dịch bị tạm chặn, bị giục chuyển tiền gấp, hoặc thấy tiền bị trừ lạ. Luôn xưng "mình", gọi người dùng là "bạn". Tiếng Việt, câu ngắn, ấm, không vòng vo.

BỐI CẢNH PHIÊN (dữ liệu dựng):
- Giao dịch: ${st.txn.id} — ${st.txn.mo_ta} — trạng thái: ${st.txn.trang_thai} (dang_giu = đang tạm giữ, tiền chưa rời ví; da_hoan_tat = tiền đã đi)
- Người đang nhắn dùng: ${st.may === "chu_vi" ? "phiên đăng nhập của chủ ví" : "MÁY KHÁC, ngoài phiên của chủ ví (có thể là người thân hoặc kẻ giả mạo, bạn không xác minh được)"}
- Đã gửi màn hình xác thực trong phiên này: ${st.xac_minh_da_gui ? "rồi" : "chưa"}
- Giờ hiện tại ${g.text}; nhân viên trực 8h–20h: ${g.truc ? "đang trực" : "NGOÀI GIỜ TRỰC"}

BẠN CHỈ ĐỀ XUẤT CÔNG CỤ; hệ thống bên ngoài mới quyết định có chạy hay không.
Công cụ có thể đề xuất: giu_giao_dich, yeu_cau_xac_minh (gửi màn hình xác thực khuôn mặt/mã một lần), chuyen_tu_van_vien, soan_ho_so_chuyen (soạn tóm tắt cho nhân viên), khoa_vi (chỉ đề xuất, chủ ví/nhân viên phải xác nhận).
KHÔNG BAO GIỜ đề xuất nha_giao_dich. Bạn không có quyền nhả giao dịch.

PHÂN LOẠI mỗi tin nhắn (trường "nhom"):
- lua_dao_dang_dien_ra: có người gọi/nhắn giục chuyển tiền, doạ "vụ án", "xác minh hồ sơ", "tài khoản an toàn"; hoặc người thân báo mẹ/bố đang bị như vậy.
- gap_that: người dùng tự trả tiền thật (vd viện phí tại quầy), không ai thúc ép, chỉ cần đi tiếp.
- chiem_tai_khoan: đổi mật khẩu, máy lạ, đăng nhập lạ, người dùng không nhận ra thao tác.
- da_xong_khieu_nai: tiền đã đi, khách nói không phải mình.
- mo_ho: thiếu thông tin để kết luận.
"tu_tin" là số từ 0 đến 1. Chỉ trên 0.75 khi tin nhắn đã đủ rõ. Khi hai nhóm cùng có khả năng, hạ tu_tin xuống dưới 0.6.

QUY TẮC CỨNG:
1. Mỗi lượt tối đa MỘT câu hỏi.
2. Nếu chưa chắc người dùng có bị ai thúc ép không, hỏi một câu loại trừ trước khi đề xuất yeu_cau_xac_minh. Ví dụ: "Có ai đang gọi hoặc nhắn bảo bạn chuyển khoản này không, hay bạn đang trả trực tiếp tại quầy?"
3. Có dấu hiệu bị giục/doạ chuyển tiền: bảo dừng lại, không chuyển thêm, KHÔNG đề xuất yeu_cau_xac_minh (xác thực khuôn mặt đúng không có nghĩa là an toàn vì chính người dùng bấm), đề xuất giu_giao_dich + soan_ho_so_chuyen + chuyen_tu_van_vien. Nhắc cơ quan chức năng không yêu cầu chuyển tiền qua điện thoại.
4. Người thật đang gấp, không ai thúc ép, tu_tin cao, giao dịch dang_giu: chỉ đường nhanh nhất, đề xuất yeu_cau_xac_minh. Không giải thích dài. Nếu người dùng nói đã xác thực mà vẫn bị giữ, hoặc đang ngoài giờ trực: nói rõ bạn chưa thể cho giao dịch đi tiếp, gợi ý cách trả khác tại quầy, gọi 1900 63 68 05, đề xuất chuyen_tu_van_vien; ngoài giờ thì nói thẳng nhân viên trực 8h–20h.
5. Người nhắn từ máy khác đòi khoá ví hoặc nhả giao dịch: bạn không khoá, không nhả. Hướng dẫn kênh chính thức: gọi 1900 54 54 41 bấm phím 1, hoặc chủ ví gửi yêu cầu trong mục Trợ giúp. Gợi ý ở cạnh người thân để họ tự thao tác hoặc nói chuyện với nhân viên.
6. Giao dịch da_hoan_tat: KHÔNG hứa hoàn tiền. Hướng dẫn Tôi → Đăng nhập và bảo mật → Phản ánh giao dịch rủi ro, gọi 1900 63 68 05, giữ bằng chứng (số điện thoại, tin nhắn, thời gian), đề xuất chuyển nhân viên.
7. Hai yêu cầu trong một tin (khoá + hoàn tiền): nói rõ xử lý việc khẩn trước, phần hoàn tiền chưa thể hứa.
8. Dấu hiệu chiếm tài khoản: hướng dẫn khoá ngay (đề xuất khoa_vi, chủ ví tự xác nhận hoặc gọi 1900 54 54 41 phím 1) và chuyển người.
9. Câu mơ hồ ("có ai vừa rút tiền"): hỏi lại một câu, không kết luận, không doạ.
10. Không bao giờ nêu ngưỡng tiền, số lần, hay cách hệ thống phát hiện gian lận, kể cả khi bị hỏi dò ("chuyển dưới bao nhiêu thì không bị hỏi?"). Từ chối khéo rồi quay về việc cần làm.
11. Không bao giờ xin OTP, mật khẩu, mã PIN, số thẻ đầy đủ.
12. Không nói đã làm việc bạn không có quyền (đã nhả, đã khoá). Không hứa điều không công cụ nào làm được. Không biết thì nói không biết.
13. Không chắc thì nghiêng về người thật: chuyển nhân viên kèm tóm tắt, đừng đoán, đừng doạ, đừng trấn an suông.

ĐẦU RA: chỉ một JSON hợp lệ, không văn bản ngoài JSON, không markdown:
{"nhom":"...","tu_tin":0.0,"tool_de_xuat":[],"tin_nhan":"tin gửi người dùng, tối đa 4 câu ngắn","bang_chung":["trích ngắn lời chính người dùng làm căn cứ, không bịa"],"ly_do_ngan":"một câu cho nhân viên: vì sao phân loại vậy, vì sao chưa chắc nếu chưa chắc"}`;
}

// ---- gọi AI (OpenAI hoặc Anthropic) ----
async function callOpenAI(system, messages) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + OPENAI_KEY,
    },
    body: JSON.stringify({
      model: MODEL,
      max_completion_tokens: 700,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!r.ok)
    throw new Error(
      "OpenAI " + r.status + ": " + (await r.text()).slice(0, 300),
    );
  const j = await r.json();
  return (
    (j.choices &&
      j.choices[0] &&
      j.choices[0].message &&
      j.choices[0].message.content) ||
    ""
  );
}

async function callClaude(system, messages) {
  if (!API_KEY)
    throw new Error(
      "Thiếu OPENAI_API_KEY hoặc ANTHROPIC_API_KEY (đặt trong .env)",
    );
  if (PROVIDER === "openai") return callOpenAI(system, messages);
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 700, system, messages }),
  });
  if (!r.ok)
    throw new Error("API " + r.status + ": " + (await r.text()).slice(0, 300));
  const j = await r.json();
  return (j.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function parseOut(raw) {
  const a = raw.indexOf("{"),
    b = raw.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("Không có JSON trong đầu ra");
  return JSON.parse(raw.slice(a, b + 1));
}

// ---- câu dự phòng an toàn (dùng khi model sai quy tắc) ----
function fallbackMsg(st, nhom) {
  const dangGiu = st.txn.trang_thai === "dang_giu";
  switch (nhom) {
    case "lua_dao_dang_dien_ra":
      return dangGiu
        ? "Bạn dừng lại giúp mình nhé: đừng chuyển thêm tiền và đừng bấm xác thực lúc này. Cơ quan chức năng không yêu cầu chuyển tiền qua điện thoại hay tin nhắn. Mình giữ nguyên giao dịch và chuyển ngay cho nhân viên, kèm tóm tắt để bạn không phải kể lại. Cần người thật ngay: gọi 1900 63 68 05."
        : "Bạn dừng lại giúp mình nhé, đừng chuyển thêm tiền. Giao dịch đã hoàn tất nên mình chưa thể hứa lấy lại tiền; mình chuyển nhân viên để tra soát. Bạn gọi 1900 63 68 05 và giữ lại số điện thoại, tin nhắn, thời gian.";
    case "chiem_tai_khoan":
      return "Có dấu hiệu tài khoản đang bị người khác dùng. Bạn xác nhận khoá ví trong app, hoặc gọi 1900 54 54 41 (phím 1). Mình đã chuyển nhân viên khẩn kèm tóm tắt. Mình sẽ không hỏi mật khẩu hay mã OTP của bạn.";
    case "da_xong_khieu_nai":
      return "Giao dịch đã hoàn tất nên mình chưa thể hứa hoàn tiền. Bạn vào Tôi → Đăng nhập và bảo mật → Phản ánh giao dịch rủi ro, và giữ lại bằng chứng. Mình chuyển nhân viên để tra soát.";
    case "gap_that":
      return "Mình hiểu bạn đang gấp. Mình chuyển nhân viên ngay để xử lý nhanh nhất; bạn cũng có thể gọi 1900 63 68 05.";
    default:
      return "Mình chưa rõ ý bạn lắm. Bạn cho mình biết giao dịch nào, và bạn đang thấy điều gì trên app?";
  }
}

// ---- tầng 3: lọc đầu ra ----
function violates(msg) {
  if (
    /(gửi|cung cấp|nhập|đọc|cho)[^.?!]{0,25}(otp|mật khẩu|mã xác thực|mã pin|số thẻ)/i.test(
      msg,
    ) &&
    !/(không|đừng|tuyệt đối)[^.?!]{0,30}(gửi|cung cấp|nhập|đọc|chia sẻ|cho)/i.test(
      msg,
    )
  )
    return "xin_ma_bi_mat";
  if (
    /(ngưỡng\s*(là|khoảng|\d)|dưới\s*\d[\d.,]*\s*(triệu|nghìn|đồng|đ|k)\b|\d+\s*lần\s*(thì|sẽ)\s*bị)/i.test(
      msg,
    )
  )
    return "lo_nguong";
  if (
    /(sẽ|chắc chắn|đảm bảo|cam kết|nhất định)\s+(được\s+)?(hoàn|trả)\s*(lại\s*)?tiền/i.test(
      msg,
    )
  )
    return "hua_hoan_tien";
  if (/(đã|vừa)\s+(nhả|khoá|khóa)\s+(giao dịch|ví|tài khoản)/i.test(msg))
    return "noi_da_lam_viec_khong_co_quyen";
  return null;
}

// ---- tầng 2: ép mức tự chủ ----
function applyPolicy(st, out) {
  let nhom = NHOM.includes(out.nhom) ? out.nhom : "mo_ho";
  let tuTin = Math.max(0, Math.min(1, Number(out.tu_tin) || 0));
  let msg = String(out.tin_nhan || "").trim();
  const bangChung = (Array.isArray(out.bang_chung) ? out.bang_chung : [])
    .slice(0, 5)
    .map((s) => String(s).slice(0, 160));
  let lyDo = String(out.ly_do_ngan || "").slice(0, 300);
  const want = new Set(
    (Array.isArray(out.tool_de_xuat) ? out.tool_de_xuat : []).filter((t) =>
      TOOL_ORDER.includes(t),
    ),
  );
  const ghiChu = [];
  const dangGiu = st.txn.trang_thai === "dang_giu";

  // ghi đè phân loại khi từ khoá thao túng/chiếm tài khoản đã bật
  if (st.thao_tung && (nhom === "gap_that" || nhom === "mo_ho")) {
    nhom = "lua_dao_dang_dien_ra";
    tuTin = Math.min(tuTin, 0.7);
    msg = fallbackMsg(st, nhom);
    ghiChu.push(
      "Server ghi đè: phát hiện dấu hiệu bị giục/doạ chuyển tiền trong hội thoại",
    );
  } else if (
    st.chiem_nghi &&
    !["chiem_tai_khoan", "lua_dao_dang_dien_ra"].includes(nhom)
  ) {
    nhom = "chiem_tai_khoan";
    tuTin = Math.min(tuTin, 0.7);
    msg = fallbackMsg(st, nhom);
    ghiChu.push("Server ghi đè: phát hiện dấu hiệu chiếm tài khoản");
  }

  if (nhom === "mo_ho") st.luot_mo_ho++;

  // việc bắt buộc theo nhóm
  if (nhom === "lua_dao_dang_dien_ra" || nhom === "chiem_tai_khoan") {
    if (dangGiu) want.add("giu_giao_dich");
    want.add("soan_ho_so_chuyen");
    want.add("chuyen_tu_van_vien");
  }
  if (nhom === "chiem_tai_khoan") want.add("khoa_vi");
  if (nhom === "da_xong_khieu_nai") {
    want.add("soan_ho_so_chuyen");
    want.add("chuyen_tu_van_vien");
  }
  if (tuTin < 0.6 && nhom !== "mo_ho") {
    want.add("soan_ho_so_chuyen");
    want.add("chuyen_tu_van_vien");
    ghiChu.push("Tự tin thấp: chuyển người thay vì đoán");
  }
  if (nhom === "mo_ho" && st.luot_mo_ho >= 2) {
    want.add("soan_ho_so_chuyen");
    want.add("chuyen_tu_van_vien");
    ghiChu.push("Đã hỏi lại mà vẫn mơ hồ: chuyển người");
  }
  if (want.has("chuyen_tu_van_vien")) want.add("soan_ho_so_chuyen");

  const effects = [];
  let xacMinhBiChan = false;
  for (const tool of TOOL_ORDER) {
    if (!want.has(tool)) continue;
    if (tool === "nha_giao_dich") {
      effects.push({
        tool,
        status: "cam",
        note: "AI không có quyền nhả giao dịch. Chỉ tư vấn viên duyệt.",
      });
    } else if (tool === "giu_giao_dich") {
      effects.push(
        dangGiu
          ? {
              tool,
              status: "done",
              note: "Giao dịch được giữ, tiền chưa rời ví",
            }
          : {
              tool,
              status: "skip",
              note: "Giao dịch đã hoàn tất, không giữ được nữa",
            },
      );
    } else if (tool === "yeu_cau_xac_minh") {
      const ly = [];
      if (st.thao_tung) ly.push("có dấu hiệu bị giục/doạ chuyển tiền");
      if (nhom !== "gap_that") ly.push("chưa xác định là người thật đang gấp");
      if (tuTin < 0.75) ly.push("độ chắc dưới mức cho phép");
      if (!dangGiu) ly.push("không có giao dịch đang giữ");
      if (st.may !== "chu_vi") ly.push("người nhắn không ở phiên của chủ ví");
      if (ly.length) {
        xacMinhBiChan = true;
        effects.push({
          tool,
          status: "blocked",
          note: "Chặn gửi xác thực: " + ly.join("; "),
        });
      } else {
        st.xac_minh_da_gui = true;
        effects.push({
          tool,
          status: "done",
          note: "Đã gửi màn hình xác thực",
        });
      }
    } else if (tool === "khoa_vi") {
      if (st.may !== "chu_vi")
        effects.push({
          tool,
          status: "cam",
          note: "Không khoá theo yêu cầu từ ngoài phiên của chủ ví. Hướng dẫn gọi 1900 54 54 41 (phím 1).",
        });
      else if (st.vi_khoa)
        effects.push({ tool, status: "skip", note: "Ví đã khoá" });
      else {
        st.cho_khoa = true;
        effects.push({
          tool,
          status: "cho_duyet",
          note: "Chờ chủ ví xác nhận trong app (hoặc nhân viên duyệt)",
        });
      }
    } else if (tool === "soan_ho_so_chuyen") {
      effects.push({
        tool,
        status: "done",
        note: "Đã soạn tóm tắt cho nhân viên",
      });
    } else if (tool === "chuyen_tu_van_vien") {
      const khan =
        nhom === "lua_dao_dang_dien_ra" ||
        nhom === "chiem_tai_khoan" ||
        tuTin < 0.6;
      const g = gioHienTai();
      effects.push({
        tool,
        status: "done",
        note:
          "Chuyển nhân viên, làn " +
          (khan ? "KHẨN" : "thường") +
          (g.truc
            ? ""
            : " (ngoài giờ trực 8h–20h, sẽ xử lý khi nhân viên vào ca)"),
        lane: khan ? "khan" : "thuong",
      });
    }
  }

  // câu trả lời phải khớp với việc thật sự xảy ra
  let daLoc = null;
  if (xacMinhBiChan) {
    msg = fallbackMsg(st, nhom);
    daLoc = "xac_thuc_bi_chan";
  }
  const vi = violates(msg);
  if (vi) {
    msg = fallbackMsg(st, nhom);
    daLoc = vi;
  }
  if (!msg) msg = fallbackMsg(st, nhom);
  if (daLoc)
    ghiChu.push("Server thay câu trả lời bằng câu an toàn (" + daLoc + ")");

  // tạo / cập nhật ca cho tư vấn viên
  const ch = effects.find((e) => e.tool === "chuyen_tu_van_vien");
  if (ch) {
    const redact = (s) => String(s).replace(/\b\d{6,}\b/g, "[đã ẩn]");
    const lastUser = [...st.history].reverse().find((m) => m.role === "user");
    const hoSo = {
      nhom,
      tu_tin: tuTin,
      ly_do: lyDo || ghiChu.join("; "),
      bang_chung: bangChung.map(redact),
      tin_nhan_cuoi: lastUser ? redact(lastUser.content) : "",
      nguoi_nhan_tin:
        st.may === "chu_vi"
          ? "phiên của chủ ví"
          : "máy khác, chưa xác minh danh tính",
      viec_ai_da_lam: effects
        .filter((e) => e.status === "done" && e.tool !== "chuyen_tu_van_vien")
        .map((e) => e.tool + ": " + e.note),
      viec_ai_bi_chan: effects
        .filter((e) => e.status === "blocked" || e.status === "cam")
        .map((e) => e.tool + ": " + e.note),
      luu_y_server: ghiChu,
    };
    let c = cases.find((x) => x.id === st.case_id);
    if (!c) {
      c = {
        id: "CA-" + String(caseSeq++).padStart(3, "0"),
        session: st.id,
        trang_thai: "cho",
        tao_luc: Date.now(),
      };
      cases.unshift(c);
      st.case_id = c.id;
    }
    if (c.trang_thai === "cho") {
      c.lane = ch.lane;
      c.ho_so = hoSo;
      c.txn = { ...st.txn };
      c.cap_nhat = Date.now();
    }
  }

  return {
    nhom,
    tu_tin: tuTin,
    tool_de_xuat: [...want],
    tin_nhan: msg,
    bang_chung: bangChung,
    da_loc: daLoc,
    effects,
  };
}

// ---- xử lý chat ----
async function handleChat(body) {
  const st = sessions.get(body.session);
  if (!st) return [404, { error: "Phiên không tồn tại, hãy bấm Làm mới." }];
  const text = String(body.message || "")
    .trim()
    .slice(0, 1500);
  if (!text) return [400, { error: "Tin nhắn trống" }];

  st.history.push({ role: "user", content: text });
  if (RE_THAO_TUNG.test(text)) st.thao_tung = true;
  if (RE_CHIEM.test(text)) st.chiem_nghi = true;

  let out;
  try {
    out = parseOut(await callClaude(buildSystem(st), st.history.slice(-20)));
  } catch (e) {
    console.error("[AI lỗi]", e.message);
    out = {
      nhom: "mo_ho",
      tu_tin: 0,
      tool_de_xuat: ["chuyen_tu_van_vien", "soan_ho_so_chuyen"],
      tin_nhan:
        "Mình đang gặp trục trặc nên chưa trả lời chắc chắn được. Mình chuyển bạn cho nhân viên ngay; bạn cũng có thể gọi 1900 63 68 05.",
      ly_do_ngan: "Lỗi hệ thống khi gọi AI: " + e.message.slice(0, 120),
    };
    st.luot_mo_ho = Math.max(st.luot_mo_ho, 1);
  }
  const res = applyPolicy(st, out);
  st.history.push({
    role: "assistant",
    content: JSON.stringify({
      nhom: res.nhom,
      tu_tin: res.tu_tin,
      tool_de_xuat: res.tool_de_xuat,
      tin_nhan: res.tin_nhan,
    }),
  });
  return [200, { reply: res, state: publicState(st) }];
}

function publicState(st) {
  const g = gioHienTai();
  return {
    txn: st.txn,
    vi_khoa: st.vi_khoa,
    cho_khoa: st.cho_khoa,
    may: st.may,
    gio: g.text,
    gio_truc: g.truc,
  };
}

// ---- HTTP ----
function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = "";
    req.on("data", (c) => {
      d += c;
      if (d.length > 20000) {
        reject(new Error("Body quá lớn"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(d ? JSON.parse(d) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}
function send(res, code, obj) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (
      req.method === "GET" &&
      (url.pathname === "/" || url.pathname === "/index.html")
    ) {
      let html;
      try {
        html = fs.readFileSync(path.join(__dirname, "public", "index.html"));
      } catch (e) {
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        return res.end(
          'Không tìm thấy file public/index.html. Hãy đổi tên file thành đúng "index.html" và đặt trong thư mục "public".',
        );
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(html);
    }
    if (req.method === "GET" && url.pathname === "/api/health")
      return send(res, 200, { ok: true, co_api_key: !!API_KEY, model: MODEL });

    if (req.method === "POST" && url.pathname === "/api/reset") {
      const b = await readBody(req);
      const id = "S" + Math.random().toString(36).slice(2, 10);
      const st = newState(id, b.scenario, b.txn, b.may);
      sessions.set(id, st);
      return send(res, 200, { session: id, state: publicState(st) });
    }
    if (req.method === "POST" && url.pathname === "/api/chat") {
      const [code, obj] = await handleChat(await readBody(req));
      return send(res, code, obj);
    }
    if (req.method === "GET" && url.pathname === "/api/state") {
      const st = sessions.get(url.searchParams.get("session"));
      if (!st) return send(res, 404, { error: "no session" });
      const outbox = st.outbox.splice(0);
      return send(res, 200, { state: publicState(st), outbox });
    }
    // nút "Chuyển nhân viên" do chính người dùng bấm
    if (req.method === "POST" && url.pathname === "/api/handoff") {
      const b = await readBody(req);
      const st = sessions.get(b.session);
      if (!st) return send(res, 404, { error: "no session" });
      const last = [...st.history].reverse().find((m) => m.role === "user");
      let c = cases.find((x) => x.id === st.case_id);
      if (!c) {
        c = {
          id: "CA-" + String(caseSeq++).padStart(3, "0"),
          session: st.id,
          trang_thai: "cho",
          tao_luc: Date.now(),
          lane: "thuong",
        };
        cases.unshift(c);
        st.case_id = c.id;
        c.ho_so = {
          nhom: "mo_ho",
          tu_tin: 0,
          ly_do: "Người dùng chủ động bấm Chuyển nhân viên",
          bang_chung: [],
          tin_nhan_cuoi: last
            ? last.content.replace(/\b\d{6,}\b/g, "[đã ẩn]")
            : "",
          nguoi_nhan_tin:
            st.may === "chu_vi"
              ? "phiên của chủ ví"
              : "máy khác, chưa xác minh danh tính",
          viec_ai_da_lam: [],
          viec_ai_bi_chan: [],
          luu_y_server: [],
        };
        c.txn = { ...st.txn };
      }
      c.cap_nhat = Date.now();
      return send(res, 200, {
        ok: true,
        case_id: c.id,
        gio_truc: gioHienTai().truc,
      });
    }
    // chủ ví tự xác nhận khoá ví trong app (mức "cần người duyệt")
    if (req.method === "POST" && url.pathname === "/api/owner/khoa") {
      const b = await readBody(req);
      const st = sessions.get(b.session);
      if (!st || st.may !== "chu_vi" || !st.cho_khoa)
        return send(res, 400, { error: "Không có đề xuất khoá hợp lệ" });
      st.vi_khoa = true;
      st.cho_khoa = false;
      return send(res, 200, { state: publicState(st) });
    }
    if (req.method === "POST" && url.pathname === "/api/owner/bo-qua-khoa") {
      const b = await readBody(req);
      const st = sessions.get(b.session);
      if (st) st.cho_khoa = false;
      return send(res, 200, { state: st ? publicState(st) : null });
    }
    // phía tư vấn viên
    if (req.method === "GET" && url.pathname === "/api/cases")
      return send(res, 200, { cases });
    if (req.method === "POST" && url.pathname === "/api/counselor/decide") {
      const b = await readBody(req);
      const c = cases.find((x) => x.id === b.id);
      if (!c || c.trang_thai !== "cho")
        return send(res, 400, { error: "Ca không còn chờ" });
      const st = sessions.get(c.session);
      const ten = "Tư vấn viên demo";
      if (b.action === "duyet_nha") {
        if (st && st.txn.trang_thai === "dang_giu")
          st.txn.trang_thai = "da_nha";
        c.quyet_dinh = "Duyệt nhả giao dịch";
        if (st)
          st.outbox.push("Nhân viên đã kiểm tra và cho giao dịch đi tiếp.");
      } else if (b.action === "giu_khoa") {
        if (st) {
          st.vi_khoa = true;
          st.cho_khoa = false;
          st.outbox.push(
            "Nhân viên đã giữ giao dịch và khoá ví để bảo vệ bạn. Mở lại ví sẽ qua tổng đài.",
          );
        }
        c.quyet_dinh = "Giữ giao dịch + khoá ví";
      } else return send(res, 400, { error: "Hành động không hợp lệ" });
      c.trang_thai = "da_xu_ly";
      c.nguoi_duyet = ten;
      c.xu_ly_luc = Date.now();
      if (st) c.txn = { ...st.txn };
      return send(res, 200, { ok: true });
    }
    send(res, 404, { error: "Not found" });
  } catch (e) {
    console.error(e);
    if (res.headersSent) return res.end();
    send(res, 500, { error: "Lỗi máy chủ" });
  }
});

server.listen(PORT, () => {
  console.log(
    "Demo chạy tại http://localhost:" +
      PORT +
      " | " +
      PROVIDER +
      " | model: " +
      MODEL +
      " | API key: " +
      (API_KEY ? "đã có" : "CHƯA CÓ (đặt OPENAI_API_KEY trong .env)"),
  );
});

