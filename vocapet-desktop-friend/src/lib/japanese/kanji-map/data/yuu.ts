import type { Enrichment } from "../types";

// Hand-authored content for 夕. Everything here is a draft to be reviewed before it is shown as verified.
export const YUU_EXTRA: Enrichment = {
  radicalName: "Bộ TỊCH",
  radicalNote: "Chính chữ này là bộ thủ số 36 (Khang Hy).",
  vocab: [
    {
      word: "夕方",
      reading: "ゆうがた",
      meaning: "Buổi chiều tối",
      source: "authored",
      composition: [],
      example: {
        ja: [
          { t: "夕方", r: "ゆうがた", hl: true },
          { t: "に" },
          { t: "友達", r: "ともだち" },
          { t: "と" },
          { t: "会", r: "あ" },
          { t: "います。" },
        ],
        vi: "Tôi gặp bạn vào buổi chiều tối.",
      },
    },
    {
      word: "夕日",
      reading: "ゆうひ",
      meaning: "Mặt trời chiều",
      source: "authored",
      composition: [],
      example: {
        ja: [{ t: "夕日", r: "ゆうひ", hl: true }, { t: "がきれいです。" }],
        vi: "Mặt trời chiều thật đẹp.",
      },
    },
    {
      word: "夕食",
      reading: "ゆうしょく",
      meaning: "Bữa tối",
      source: "authored",
      composition: [],
      example: {
        ja: [
          { t: "夕食", r: "ゆうしょく", hl: true },
          { t: "を" },
          { t: "食", r: "た" },
          { t: "べます。" },
        ],
        vi: "Tôi ăn bữa tối.",
      },
    },
  ],
  sentences: [
    {
      ja: [
        { t: "夕方", r: "ゆうがた", hl: true },
        { t: "に" },
        { t: "友達", r: "ともだち" },
        { t: "と" },
        { t: "会", r: "あ" },
        { t: "います。" },
      ],
      vi: "Tôi gặp bạn vào buổi chiều tối.",
      source: "authored",
    },
  ],
  mnemonic: {
    origin: "Chữ tượng hình: hình mặt trăng khuyết nhìn thấy lúc trời bắt đầu tối.",
    tip: "Thấy trăng khuyết lên là đã sang buổi tối (夕).",
    related: [
      { char: "朝", meaning: "buổi sáng" },
      { char: "昼", meaning: "buổi trưa" },
      { char: "夜", meaning: "ban đêm" },
    ],
  },
};
