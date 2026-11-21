// SPDX-License-Identifier: MIT
import type { RuleSet } from '@core/index';
import enCii from '@core/../rules/en16931-cii.sef.json?url';
import enUbl from '@core/../rules/en16931-ubl.sef.json?url';
import xrCii from '@core/../rules/xrechnung-cii.sef.json?url';
import xrUbl from '@core/../rules/xrechnung-ubl.sef.json?url';
import regular from '@core/../assets/OpenSans-Regular.ttf?url';
import bold from '@core/../assets/OpenSans-Bold.ttf?url';

export const RULE_URLS: Record<RuleSet, string> = {
  'en16931-cii': enCii,
  'en16931-ubl': enUbl,
  'xrechnung-cii': xrCii,
  'xrechnung-ubl': xrUbl,
};

export const FONT_URLS = { regular, bold };
