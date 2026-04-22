import { fontScale } from "./dimensions";

const fs = (size: number): number => fontScale(size);

export const fonts = {
  fontRegular: "fontRegular", //400
  fontMedium: "fontMedium", //500
  fontSemiBold: "fontSemiBold", //600 (alias to medium asset)
  fontBold: "fontBold", //700
  fontExtraBold: "fontExtraBold", //800
} as const;

export const Font = {
  fontRegular: require("@/assets/fonts/FormaDJRDeck-Regular-Testing.ttf"),
  fontMedium: require("@/assets/fonts/FormaDJRDisplay-Medium-Testing.ttf"),
  fontSemiBold: require("@/assets/fonts/FormaDJRDisplay-Medium-Testing.ttf"),
  fontBold: require("@/assets/fonts/FormaDJRText-Bold-Testing.ttf"),
  fontExtraBold: require("@/assets/fonts/FormaDJRText-ExtraBold-Testing.ttf"),
} as const;

export const fontSize = Object.freeze({
  size1: fs(1),
  size2: fs(2),
  size3: fs(3),
  size4: fs(4),
  size5: fs(5),
  size6: fs(6),
  size7: fs(7),
  size8: fs(8),
  size9: fs(9),
  size10: fs(10),
  size11: fs(11),
  size12: fs(12),
  size13: fs(13),
  size14: fs(14),
  size15: fs(15),
  size16: fs(16),
  size17: fs(17),
  size18: fs(18),
  size19: fs(19),
  size20: fs(20),
  size21: fs(21),
  size22: fs(22),
  size23: fs(23),
  size24: fs(24),
  size25: fs(25),
  size26: fs(26),
  size27: fs(27),
  size28: fs(28),
  size29: fs(29),
  size30: fs(30),
  size31: fs(31),
  size32: fs(32),
  size33: fs(33),
  size34: fs(34),
  size35: fs(35),
  size36: fs(36),
  size37: fs(37),
  size38: fs(38),
  size39: fs(39),
  size40: fs(40),
  size42: fs(42),
  size44: fs(44),
  size46: fs(46),
  size48: fs(48),
  size50: fs(50),
  size52: fs(52),
  size54: fs(54),
  size56: fs(56),
  size58: fs(58),
  size60: fs(60),
  size62: fs(62),
  size64: fs(64),
  size66: fs(66),
  size68: fs(68),
  size70: fs(70),
});
