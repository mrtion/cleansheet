/**
 * 预设注册表（配置驱动，版本化；平台改版表头时可热更新，FR-T-07）。
 */
import type { Preset } from '../types';
import { amazonSettlementPreset } from './amazon-settlement';
import { shopifyOrdersPreset } from './shopify-orders';
import { tiktokShopFinancialsPreset } from './tiktok-shop-financials';
import { shopeePreset } from './shopee';

export const PRESETS: Preset[] = [
  amazonSettlementPreset,
  shopifyOrdersPreset,
  tiktokShopFinancialsPreset,
  shopeePreset
];
