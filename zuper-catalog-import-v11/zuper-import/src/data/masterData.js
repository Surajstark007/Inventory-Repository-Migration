// Generated from Measurement_Token_Master.csv and Formula_master.csv

export const MASTER_TOKENS = [
  { name: 'Total Roof Area', category: 'Roof Measurements', uom: 'SQFT' },
  { name: 'Total Ridges Length', category: 'Roof Measurements', uom: 'LF' },
  { name: 'Total Valleys Length', category: 'Roof Measurements', uom: 'LF' },
  { name: 'Total Rakes Length', category: 'Roof Measurements', uom: 'LF' },
  { name: 'Total Eaves Length', category: 'Roof Measurements', uom: 'LF' },
  { name: 'Total Hip Length', category: 'Roof Measurements', uom: 'LF' },
  { name: 'Total Step Flashing Length', category: 'Roof Measurements', uom: 'LF' },
  { name: 'Total Roof Facets Area', category: 'Roof Measurements', uom: 'SQFT' },
  { name: 'Total Roof Area (in squares)', category: 'Roof Measurements', uom: 'SQ' },
  { name: 'Headwall Flashing', category: 'Roof Measurements', uom: 'LF' },
  { name: 'Total Siding Area', category: 'Siding Measurements', uom: 'SQFT' },
  { name: 'Gutter Length', category: 'Gutters', uom: 'LF' },
  { name: 'No of Downspouts', category: 'Gutters', uom: 'EA' },
  { name: 'No of End Caps', category: 'Gutters', uom: 'EA' },
  { name: 'No of Outside Miters', category: 'Gutters', uom: 'EA' },
  { name: 'No of Inside Miters', category: 'Gutters', uom: 'EA' },
  { name: 'Downspout Elbows', category: 'Gutters', uom: 'EA' },
  { name: 'No of Inner Elbows', category: 'Gutters', uom: 'EA' },
  { name: 'No of Outer Elbows', category: 'Gutters', uom: 'EA' },
  { name: 'Suggested Waste Percentage %', category: 'Roof Waste Factors', uom: '%' },
  { name: 'Waste Factor %', category: 'Roof Waste Factors', uom: '%' },
  { name: 'No of Vents', category: 'Ventilation', uom: 'EA' },
  { name: 'LF of Eave Intake Vents Needed', category: 'Ventilation', uom: 'LF' },
];

export const PROPOSAL_LINE_ITEMS = [
  {
    name: 'Shingles', srs_category: 'SHINGLES', output_uom: 'SQ',
    formula_expr: '(Total Roof Area * (1 + Suggested Waste Percentage % / 100)) / 100',
    tokens_used: ['Total Roof Area', 'Suggested Waste Percentage %'],
    relevant_formulas: [
      { name: 'Shingles (squares)', expression: '(Total Roof Area * (1 + Suggested Waste Percentage % / 100)) / 100', key: 'shingles_sq', category: 'AREA_MEASUREMENT', description: 'Standard shingle quantity in squares' },
      { name: 'Shingles for Roof', expression: '((Total Roof Area *(1+Suggested Waste Percentage % /100)))/33', key: 'Roof_Shingles', category: 'AREA_MEASUREMENT', description: 'Shingles in bundles (33 SQ/bundle)' },
      { name: 'Starter Shingles (bundles)', expression: '(Total Eaves Length + Total Rakes Length) / 120', key: 'starter_shingles_bundles', category: 'AREA_MEASUREMENT', description: '' },
    ],
  },
  {
    name: 'Hip & Ridge Cap', srs_category: 'HIP AND RIDGE', output_uom: 'BD',
    formula_expr: 'CEIL((Total Hip Length + Total Ridges Length) / 33)',
    tokens_used: ['Total Hip Length', 'Total Ridges Length'],
    relevant_formulas: [
      { name: 'Hip & Ridge Cap Shingles (bundles)', expression: '(Total Hip Length + Total Ridges Length) / 33', key: 'hip_ridge_cap_shingles_bundles', category: 'AREA_MEASUREMENT', description: '' },
      { name: 'Hip & Ridge Cap - Metal', expression: '((Total Ridges Length + Total Hip Length) * (1 + Suggested Waste Percentage % / 100)) / 10', key: 'Ridge_cap_metal', category: 'AREA_MEASUREMENT', description: 'Metal hip/ridge pieces' },
      { name: 'Ridge Cap & Starter Strip', expression: '(Total Hip Length + Total Ridges Length) / 33', key: 'ridge_cap_starter', category: 'AREA_MEASUREMENT', description: '' },
    ],
  },
  {
    name: 'Starter Strip', srs_category: 'STARTER', output_uom: 'BD',
    formula_expr: 'CEIL((Total Eaves Length + Total Rakes Length) / 120)',
    tokens_used: ['Total Eaves Length', 'Total Rakes Length'],
    relevant_formulas: [
      { name: 'Starter Strip', expression: '((Total Rakes Length + Total Eaves Length + LF of Eave Intake Vents Needed) * (1 + (Suggested Waste Percentage % / 100))) / 105', key: 'SS-9009', category: 'AREA_MEASUREMENT', description: 'Includes eave intake vent LF' },
      { name: 'Starter (bundles)', expression: '(Total Eaves Length + Total Rakes Length) / 120', key: 'starter_bundles', category: 'AREA_MEASUREMENT', description: 'Simple bundle count' },
    ],
  },
  {
    name: 'Underlayment — Synthetic', srs_category: 'UNDERLAYMENT', output_uom: 'RL',
    formula_expr: 'CEIL(Total Roof Area * (1 + Suggested Waste Percentage % / 100) / 1000)',
    tokens_used: ['Total Roof Area', 'Suggested Waste Percentage %'],
    relevant_formulas: [
      { name: 'Synthetic Underlayment (rolls)', expression: 'Total Roof Facets Area / 1000', key: 'synthetic_underlayment_rolls', category: 'AREA_MEASUREMENT', description: '' },
      { name: 'Synthetic Underlayment', expression: '(Total Roof Area * (1 + Suggested Waste Percentage % / 100)) / 1000', key: 'synth_und_waste', category: 'AREA_MEASUREMENT', description: 'Includes waste factor' },
    ],
  },
  {
    name: 'Underlayment — Felt 15#', srs_category: 'UNDERLAYMENT', output_uom: 'RL',
    formula_expr: 'CEIL(Total Roof Area * (1 + Suggested Waste Percentage % / 100) / 400)',
    tokens_used: ['Total Roof Area', 'Suggested Waste Percentage %'],
    relevant_formulas: [
      { name: 'Felt 15# Underlayment (rolls)', expression: '(Total Roof Area * (1 + Suggested Waste Percentage % / 100)) / 400', key: 'felt15_rolls', category: 'AREA_MEASUREMENT', description: '400 SQFT per roll' },
      { name: 'FeltBuster Underlayment — Rolls', expression: 'Total Roof Area (in squares) * (1 + Suggested Waste Percentage % / 100) / 10', key: 'feltbuster_rolls', category: 'AREA_MEASUREMENT', description: '' },
    ],
  },
  {
    name: 'Underlayment — Felt 30#', srs_category: 'UNDERLAYMENT', output_uom: 'RL',
    formula_expr: 'CEIL(Total Roof Area * (1 + Suggested Waste Percentage % / 100) / 200)',
    tokens_used: ['Total Roof Area', 'Suggested Waste Percentage %'],
    relevant_formulas: [
      { name: 'Felt 30# Underlayment (rolls)', expression: '(Total Roof Area * (1 + Suggested Waste Percentage % / 100)) / 200', key: 'felt30_rolls', category: 'AREA_MEASUREMENT', description: '200 SQFT per roll' },
    ],
  },
  {
    name: 'Underlayment — Self-Adhered HT', srs_category: 'UNDERLAYMENT', output_uom: 'RL',
    formula_expr: 'CEIL(Total Roof Area * (1 + Suggested Waste Percentage % / 100) / 200)',
    tokens_used: ['Total Roof Area', 'Suggested Waste Percentage %'],
    relevant_formulas: [
      { name: 'Self-Adhered Underlayment (rolls)', expression: '(Total Roof Area * (1 + Suggested Waste Percentage % / 100)) / 200', key: 'sa_und_rolls', category: 'AREA_MEASUREMENT', description: '' },
    ],
  },
  {
    name: 'Ice & Water — Standard', srs_category: 'ICE AND WATER', output_uom: 'RL',
    formula_expr: 'CEIL((Total Eaves Length + Total Valleys Length) * 1.1 / 66)',
    tokens_used: ['Total Eaves Length', 'Total Valleys Length'],
    relevant_formulas: [
      { name: 'Ice and Water Shield (rolls)', expression: '((Total Eaves Length + Total Valleys Length) * 1.1) / 66', key: 'ice_and_water_shield_rolls', category: 'AREA_MEASUREMENT', description: '' },
      { name: 'Ice & Water (rolls)', expression: '((Total Eaves Length + Total Valleys Length) * 1.1) / 66', key: 'ice_water_rolls', category: 'AREA_MEASUREMENT', description: '' },
    ],
  },
  {
    name: 'Drip Edge', srs_category: 'DRIP EDGE', output_uom: 'PC',
    formula_expr: 'CEIL((Total Rakes Length + Total Eaves Length) / 10)',
    tokens_used: ['Total Rakes Length', 'Total Eaves Length'],
    relevant_formulas: [
      { name: 'Drip Edge (pieces)', expression: '(Total Rakes Length + Total Eaves Length) / 10', key: 'drip_edge_pieces', category: 'AREA_MEASUREMENT', description: '10 LF per piece' },
      { name: 'Drip Edge (LF)', expression: 'Total Rakes Length + Total Eaves Length', key: 'drip_edge_lf', category: 'AREA_MEASUREMENT', description: 'Linear feet' },
    ],
  },
  {
    name: 'W-Valley', srs_category: 'W-VALLEY', output_uom: 'PC',
    formula_expr: 'CEIL(Total Valleys Length / 10)',
    tokens_used: ['Total Valleys Length'],
    relevant_formulas: [
      { name: 'Valley Metal (pieces)', expression: 'Total Valleys Length / 10', key: 'valley_metal_pieces', category: 'AREA_MEASUREMENT', description: '' },
      { name: 'W-Valley (pieces)', expression: 'Total Valleys Length / 10', key: 'w_valley_pieces', category: 'AREA_MEASUREMENT', description: '' },
    ],
  },
  {
    name: 'Gutter Apron', srs_category: 'GUTTER APRON', output_uom: 'PC',
    formula_expr: 'CEIL((Total Rakes Length + Total Eaves Length) / 10)',
    tokens_used: ['Total Rakes Length', 'Total Eaves Length'],
    relevant_formulas: [
      { name: 'Gutter Apron (pieces)', expression: '(Total Rakes Length + Total Eaves Length) / 10', key: 'gutter_apron_pieces', category: 'AREA_MEASUREMENT', description: '' },
    ],
  },
  {
    name: 'Coil Nails', srs_category: 'COIL NAILS', output_uom: 'BX',
    formula_expr: 'CEIL(Total Roof Area * 3.2 / 3600)',
    tokens_used: ['Total Roof Area'],
    relevant_formulas: [
      { name: 'Coil Nails (boxes)', expression: 'Total Roof Area * 3.2 / 3600', key: 'coil_nails_boxes', category: 'AREA_MEASUREMENT', description: '3,600 nails per box' },
    ],
  },
  {
    name: 'Plastic Cap Nails', srs_category: 'PLASTIC CAPS', output_uom: 'BX',
    formula_expr: 'CEIL(Total Roof Area / 400)',
    tokens_used: ['Total Roof Area'],
    relevant_formulas: [
      { name: 'Plastic Cap Nails (boxes)', expression: 'Total Roof Area / 400', key: 'plastic_cap_nails', category: 'AREA_MEASUREMENT', description: '' },
    ],
  },
  {
    name: 'Ridge Vent', srs_category: 'VENTS', output_uom: 'PC',
    formula_expr: 'CEIL(Total Ridges Length / 4)',
    tokens_used: ['Total Ridges Length'],
    relevant_formulas: [
      { name: 'Ridge Vents (bundles)', expression: 'Total Ridges Length / 4', key: 'ridge_vents_bundles', category: 'AREA_MEASUREMENT', description: '4 LF per piece' },
      { name: 'Ridge Vent (LF)', expression: 'Total Ridges Length', key: 'ridge_vent_lf', category: 'AREA_MEASUREMENT', description: 'Linear feet of ridge vent' },
    ],
  },
  {
    name: 'Box Vent', srs_category: 'VENTS', output_uom: 'EA',
    formula_expr: null, tokens_used: [],
    relevant_formulas: [
      { name: 'Box Vents (ea)', expression: 'No of Vents', key: 'box_vents_ea', category: 'AREA_MEASUREMENT', description: '' },
    ],
  },
  {
    name: 'Power Vent / Attic Fan', srs_category: 'VENTS', output_uom: 'EA',
    formula_expr: null, tokens_used: [],
    relevant_formulas: [],
  },
  {
    name: 'Soffit Vent', srs_category: 'VENTS', output_uom: 'EA',
    formula_expr: null, tokens_used: [],
    relevant_formulas: [],
  },
  {
    name: 'Pipe Boot 2"', srs_category: 'PIPE FLASHING', output_uom: 'EA',
    formula_expr: null, tokens_used: [],
    relevant_formulas: [],
  },
  {
    name: 'Pipe Boot 3"', srs_category: 'PIPE FLASHING', output_uom: 'EA',
    formula_expr: null, tokens_used: [],
    relevant_formulas: [],
  },
  {
    name: 'Pipe Boot 4"', srs_category: 'PIPE FLASHING', output_uom: 'EA',
    formula_expr: null, tokens_used: [],
    relevant_formulas: [],
  },
  {
    name: 'Step Flashing', srs_category: 'OTHER FLASHING METAL', output_uom: 'PC',
    formula_expr: 'CEIL(Total Step Flashing Length / 10)',
    tokens_used: ['Total Step Flashing Length'],
    relevant_formulas: [
      { name: 'Step Flashing (pieces)', expression: 'Total Step Flashing Length / 10', key: 'step_flashing_pieces', category: 'AREA_MEASUREMENT', description: '' },
    ],
  },
  {
    name: 'Counter / Headwall Flashing', srs_category: 'OTHER FLASHING METAL', output_uom: 'PC',
    formula_expr: 'CEIL(Headwall Flashing / 10)',
    tokens_used: ['Headwall Flashing'],
    relevant_formulas: [
      { name: 'Counter Flashing (pieces)', expression: 'Headwall Flashing / 10', key: 'counter_flashing_pieces', category: 'AREA_MEASUREMENT', description: '' },
    ],
  },
  {
    name: 'Chimney Flashing Kit', srs_category: 'OTHER FLASHING METAL', output_uom: 'EA',
    formula_expr: null, tokens_used: [],
    relevant_formulas: [],
  },
  {
    name: 'Caulk / Sealant', srs_category: 'CAULK', output_uom: 'TB',
    formula_expr: null, tokens_used: [],
    relevant_formulas: [],
  },
  {
    name: 'Gutter Sections', srs_category: 'GUTTER/ALUMINUM/COIL', output_uom: 'PC',
    formula_expr: 'CEIL(Gutter Length / 10)',
    tokens_used: ['Gutter Length'],
    relevant_formulas: [
      { name: 'Gutters (pieces)', expression: 'Gutter Length / 10', key: 'gutters_pieces', category: 'AREA_MEASUREMENT', description: '' },
      { name: 'Gutter (LF)', expression: 'Gutter Length', key: 'gutter_lf', category: 'AREA_MEASUREMENT', description: '' },
    ],
  },
  {
    name: 'Downspouts', srs_category: 'GUTTER/ALUMINUM/COIL', output_uom: 'EA',
    formula_expr: 'No of Downspouts',
    tokens_used: ['No of Downspouts'],
    relevant_formulas: [
      { name: 'Downspouts (ea)', expression: 'No of Downspouts', key: 'downspouts_ea', category: 'AREA_MEASUREMENT', description: '' },
    ],
  },
  {
    name: 'Gutter End Caps', srs_category: 'GUTTER/ALUMINUM/COIL', output_uom: 'EA',
    formula_expr: 'No of End Caps',
    tokens_used: ['No of End Caps'],
    relevant_formulas: [
      { name: 'Gutter End Caps (ea)', expression: 'No of End Caps', key: 'end_caps_ea', category: 'AREA_MEASUREMENT', description: '' },
    ],
  },
  {
    name: 'Gutter Elbows', srs_category: 'GUTTER/ALUMINUM/COIL', output_uom: 'EA',
    formula_expr: 'Downspout Elbows + No of Inner Elbows + No of Outer Elbows',
    tokens_used: ['Downspout Elbows', 'No of Inner Elbows', 'No of Outer Elbows'],
    relevant_formulas: [
      { name: 'Gutter Elbows (ea)', expression: 'Downspout Elbows + No of Inner Elbows + No of Outer Elbows', key: 'gutter_elbows_ea', category: 'AREA_MEASUREMENT', description: '' },
    ],
  },
  {
    name: 'Siding', srs_category: 'SIDING', output_uom: 'SQ',
    formula_expr: 'CEIL(Total Siding Area * (1 + Suggested Waste Percentage % / 100) / 100)',
    tokens_used: ['Total Siding Area', 'Suggested Waste Percentage %'],
    relevant_formulas: [
      { name: 'Siding (squares)', expression: '(Total Siding Area * (1 + Suggested Waste Percentage % / 100)) / 100', key: 'siding_squares', category: 'AREA_MEASUREMENT', description: '' },
    ],
  },
  {
    name: 'Roof Decking (OSB)', srs_category: 'DECKING', output_uom: 'PC',
    formula_expr: 'CEIL(Total Roof Area / 32 * (1 + Suggested Waste Percentage % / 100))',
    tokens_used: ['Total Roof Area', 'Suggested Waste Percentage %'],
    relevant_formulas: [
      { name: 'Decking (sheets)', expression: 'Total Roof Area / 32 * (1 + Suggested Waste Percentage % / 100)', key: 'decking_sheets', category: 'AREA_MEASUREMENT', description: '4x8 sheet = 32 SQFT' },
    ],
  },
];

export const ALL_BRANDS = [
  // Values MUST match manufacturer_norm column in Supabase srs_products exactly
  'Gaf', 'Owens Corning', 'Certainteed', 'Atlas', 'Tamko', 'Iko', 'Malarkey',
  'Boral', 'Eagle', 'Davinci Roofscapes', 'Decra', 'F-wave', 'Pabco', 'Cedur',
  'Edco', 'Tilcor', 'Brava Roof Tile', 'Tesla', 'Ecostar', 'Inspire', 'Alside',
  'Azek', 'Alsco', 'Klauer Manufacturing', 'Foundry', 'Diamond Ridge', 'Everlast',
  'Provia', 'Stoneworth', 'Topshield', 'Boral Steel',
];

export const BIG3 = ['Gaf', 'Owens Corning', 'Certainteed'];

export const SUPABASE_URL = 'https://kbdczzldmyayliwajwma.supabase.co';
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZGN6emxkbXlheWxpd2Fqd21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTcxNjQsImV4cCI6MjA5MzEzMzE2NH0.6EoEymO0rqSL-BLZkkW9X4sdyjJNhluis3eNSAH1nGM';
