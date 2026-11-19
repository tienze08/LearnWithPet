// Data sources and the attribution they require. The /app/japanese/kanji-sources page renders this list.
// Only sources with inUse = true are described as used; the rest are planned (see docs/KANJI_DESIGN.md §6).
export type DataSource = {
  id: string;
  name: string;
  provides: string;
  holder: string;
  licence: string;
  licenceUrl: string;
  homepage: string;
  changes: string;
  inUse: boolean;
};

export const DATA_SOURCES: DataSource[] = [
  {
    id: "vocapet",
    name: "Dữ liệu kanji VocaPet",
    provides: "Chữ, nghĩa tiếng Việt, Hán Việt, âm On/Kun, số nét, từ ví dụ.",
    holder: "VocaPet",
    licence: "Nội dung của VocaPet",
    licenceUrl: "",
    homepage: "",
    changes: "",
    inUse: true,
  },
  {
    id: "tango",
    name: "Từ vựng Tango (Minna no Nihongo)",
    provides: "Từ vựng, ví dụ và bản dịch lấy từ kho nội dung Tango của VocaPet.",
    holder: "VocaPet",
    licence: "Nội dung của VocaPet",
    licenceUrl: "",
    homepage: "",
    changes: "",
    inUse: true,
  },
  {
    id: "unihan",
    name: "Unicode Unihan (kVietnamese)",
    provides: "Âm Hán Việt của các kanji ngoài 71 chữ VocaPet tự biên soạn; một số chữ tra qua dạng biến thể (phồn thể, giản thể).",
    holder: "Unicode, Inc.",
    licence: "Unicode License v3",
    licenceUrl: "https://www.unicode.org/license.txt",
    homepage: "https://www.unicode.org/charts/unihan.html",
    changes: "Chỉ trích trường kVietnamese và các biến thể giữ nguyên cách đọc, chuyển thành JSON (tools/importHanViet.py). Âm viết tay của VocaPet luôn được ưu tiên.",
    inUse: true,
  },
  {
    id: "kanjidic2",
    name: "KANJIDIC2",
    provides: "Số bộ thủ Khang Hy, số nét, lớp học và cấp JLPT (thang cũ).",
    holder: "James William Breen và EDRDG",
    licence: "CC BY-SA 4.0 (EDRDG General Dictionary Licence)",
    licenceUrl: "https://www.edrdg.org/edrdg/licence.html",
    homepage: "https://www.edrdg.org/wiki/index.php/KANJIDIC_Project",
    changes: "Trích một phần các trường dữ liệu cho các kanji trong VocaPet và chuyển sang JSON (bản 2026-321).",
    inUse: true,
  },
  {
    id: "kradfile",
    name: "KRADFILE",
    provides: "Danh sách thành phần cấu tạo của từng kanji.",
    holder: "EDRDG",
    licence: "CC BY-SA 4.0 (EDRDG General Dictionary Licence)",
    licenceUrl: "https://www.edrdg.org/edrdg/licence.html",
    homepage: "https://www.edrdg.org/krad/kradinf.html",
    changes: "Trích danh sách thành phần cho các kanji trong VocaPet và chuyển sang JSON.",
    inUse: true,
  },
  {
    id: "kanjivg",
    name: "KanjiVG",
    provides: "Nét vẽ và thứ tự nét của từng kanji.",
    holder: "Ulrich Apel",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    homepage: "http://kanjivg.tagaini.net",
    changes: "Đường nét SVG giữ nguyên, được trích riêng cho các kanji trong VocaPet và đóng gói thành JSON (bản r20260714). Bộ thủ lấy từ thuộc tính của KanjiVG.",
    inUse: true,
  },
];
