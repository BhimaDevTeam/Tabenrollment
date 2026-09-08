// commodityConfig.js
// Maps a scheme's CommodityTypeID to the rate CommodityTypeID(s) used for weight calculation.
// "primary"   -> shown as "22Kt Gold Rate" / "Weight"
// "secondary" -> optional, shown as "Silver Rate" / "Silver Weight"
//
// To change which rate a scheme type uses, just edit the numbers below —
// no changes needed in MembershipDetails.jsx.

export const SCHEME_COMMODITY_RATE_MAP = {
  1: { primary: 1 },               // Gold schemes -> Gold rate (CommodityTypeID 1)
  5: { primary: 1, secondary: 7 }, // Silver Coin schemes -> Gold (1) + Silver Coin (7)
};