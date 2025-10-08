import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type Props = {
  typeId?: string;          // opzionale: usato per auto-selezionare un preset sensato
  value: any;               // JSON corrente dal form padre
  onChange: (next: any) => void;
};

/* ===================== PRESETS ===================== */
type PresetId =
  | "surface.bolts.treatment"
  | "mechanical.component"
  | "chemical.product"
  | "construction.material"
  | "electronic.component"
  | "textile.product"
  | "food.product"
  | "pharma.product"
  | "automotive.component"
  | "building.insulation"
  | "energy.component"
  | "cosmetic.product"
  | "industrial.tool"
  | "tech.accessory"
  | "agri.product";

const PRESETS: Record<PresetId, { label: string; example: any }> = {
  "surface.bolts.treatment": {
    label: "🔩 Trattamento Superficiale Bulloneria",
    example: {
      name: "Trattamento Zincatura Bulloni M8",
      sku: "ZINC-M8-001",
      substrate: "acciaio_al_carbonio",
      coating_type: "zincatura_elettrolitica",
      thickness_microns: 12,
      thread_size: "M8x1.25",
      quantity_per_batch: 1000,
    },
  },
  "mechanical.component": {
    label: "⚙️ Componente Meccanico",
    example: {
      name: "Cuscinetto a Sfere 6205",
      sku: "BEAR-6205-STD",
      inner_diameter_mm: 25,
      outer_diameter_mm: 52,
      width_mm: 15,
      material: "acciaio_inox_AISI_440C",
      load_rating_kn: 14.0,
      speed_rating_rpm: 18000,
    },
  },
  "chemical.product": {
    label: "🧪 Prodotto Chimico",
    example: {
      name: "Solvente Industriale Acetone",
      sku: "SOLV-ACE-25L",
      chemical_formula: "C3H6O",
      purity_percentage: 99.5,
      volume_liters: 25,
      flash_point_celsius: -20,
      hazard_class: "3",
      cas_number: "67-64-1",
    },
  },
  "construction.material": {
    label: "🏗️ Materiale da Costruzione",
    example: {
      name: "Cemento Portland CEM II/A-LL 42.5R",
      sku: "CEM-PRT-42.5R",
      cement_type: "CEM_II_A_LL",
      strength_class: "42.5R",
      weight_kg: 25,
      setting_time_minutes: 45,
      compressive_strength_mpa: 42.5,
      limestone_content_percent: 15,
    },
  },
  "electronic.component": {
    label: "🔌 Componente Elettronico",
    example: {
      name: "Microcontrollore ARM Cortex-M4",
      sku: "MCU-ARM-M4-128",
      processor_core: "ARM_Cortex_M4",
      flash_memory_kb: 128,
      ram_kb: 32,
      operating_voltage_v: 3.3,
      package_type: "LQFP64",
      operating_temp_range: "-40_to_85_celsius",
    },
  },
  "textile.product": {
    label: "🧵 Prodotto Tessile",
    example: {
      name: "Tessuto Cotone Biologico 200gsm",
      sku: "TEX-COT-BIO-200",
      fiber_composition: "100_percent_organic_cotton",
      weight_gsm: 200,
      width_cm: 150,
      weave_type: "plain_weave",
      color: "natural_white",
      certification: "GOTS_certified",
    },
  },
  "food.product": {
    label: "🍞 Prodotto Alimentare",
    example: {
      name: "Farina di Grano Tenero Tipo 00",
      sku: "FLOUR-00-1KG",
      grain_type: "grano_tenero",
      flour_type: "tipo_00",
      protein_content_percent: 11.5,
      weight_kg: 1,
      gluten_strength_w: 280,
      expiry_months: 12,
      origin: "Italia",
    },
  },
  "pharma.product": {
    label: "💊 Prodotto Farmaceutico",
    example: {
      name: "Paracetamolo Compresse 500mg",
      sku: "PARA-500-30CPR",
      active_ingredient: "paracetamolo",
      dosage_mg: 500,
      pharmaceutical_form: "compresse_rivestite",
      quantity_per_pack: 30,
      therapeutic_class: "analgesico_antipiretico",
      prescription_required: false,
    },
  },
  "automotive.component": {
    label: "🚗 Componente Automotive",
    example: {
      name: "Pastiglie Freno Anteriori Ceramiche",
      sku: "BRAKE-CER-ANT-BMW",
      brake_type: "pastiglie_anteriori",
      material: "ceramica_semi_metallica",
      vehicle_compatibility: "BMW_Serie_3_F30",
      friction_coefficient: 0.42,
      operating_temp_max_celsius: 650,
      wear_indicator: true,
    },
  },
  "building.insulation": {
    label: "🏠 Prodotto per Edilizia",
    example: {
      name: "Isolante Termico in Lana di Roccia",
      sku: "INSUL-ROCK-100-10M2",
      insulation_type: "lana_di_roccia",
      thickness_mm: 100,
      thermal_conductivity: 0.035,
      coverage_m2: 10,
      fire_resistance_class: "A1",
      density_kg_m3: 45,
    },
  },
  "energy.component": {
    label: "🔋 Componente Energetico",
    example: {
      name: "Batteria Litio-Ion 18650 3.7V",
      sku: "BATT-LI-18650-2600",
      battery_type: "litio_ion",
      voltage_nominal_v: 3.7,
      capacity_mah: 2600,
      diameter_mm: 18,
      length_mm: 65,
      max_discharge_rate: "10C",
      cycle_life: 500,
    },
  },
  "cosmetic.product": {
    label: "🧴 Prodotto Cosmetico",
    example: {
      name: "Crema Viso Idratante Anti-Age",
      sku: "COSM-FACE-ANTIAGE-50",
      product_type: "crema_viso",
      skin_type: "tutti_i_tipi",
      volume_ml: 50,
      spf_factor: 15,
      key_ingredients: "acido_ialuronico_vitamina_e",
      age_target: "35_plus",
      dermatologically_tested: true,
    },
  },
  "industrial.tool": {
    label: "🛠️ Utensile Industriale",
    example: {
      name: "Punta Elicoidale HSS-Co 8.5mm",
      sku: "DRILL-HSS-CO-8.5",
      tool_type: "punta_elicoidale",
      diameter_mm: 8.5,
      material: "HSS_cobalto_5_percent",
      coating: "TiN_titanium_nitride",
      shank_type: "cilindrico",
      point_angle_degrees: 135,
      suitable_materials: "acciaio_inox_ghisa",
    },
  },
  "tech.accessory": {
    label: "🔗 Accessorio Tecnologico",
    example: {
      name: "Cavo USB-C to Lightning 2m",
      sku: "CABLE-USBC-LIGHT-2M",
      connector_type_a: "USB_C",
      connector_type_b: "Lightning",
      cable_length_m: 2,
      data_transfer_speed: "USB_2.0",
      power_delivery_w: 20,
      mfi_certified: true,
      color: "white",
    },
  },
  "agri.product": {
    label: "🌾 Prodotto Agricolo",
    example: {
      name: "Fertilizzante NPK 20-10-10 Granulare",
      sku: "FERT-NPK-201010-25KG",
      fertilizer_type: "NPK_granulare",
      nitrogen_percent: 20,
      phosphorus_percent: 10,
      potassium_percent: 10,
      weight_kg: 25,
      release_type: "lento_rilascio",
      suitable_crops: "cereali_ortaggi",
    },
  },
};

/* ============== MAPPING typeId → preset di default ============== */
function derivePresetFromType(typeId?: string): PresetId {
  const t = (typeId || "").toLowerCase();
  if (t.includes("surface") || t.includes("zinc") || t.includes("bolt")) return "surface.bolts.treatment";
  if (t.includes("mech") || t.includes("bearing") || t.includes("generic")) return "mechanical.component";
  if (t.includes("chem") || t.includes("solv") || t.includes("acetone")) return "chemical.product";
  if (t.includes("construct") || t.includes("cement") || t.includes("cem")) return "construction.material";
  if (t.includes("electr") || t.includes("mcu") || t.includes("micro")) return "electronic.component";
  if (t.includes("textile") || t.includes("cotton") || t.includes("gots")) return "textile.product";
  if (t.includes("food") || t.includes("flour")) return "food.product";
  if (t.includes("pharm") || t.includes("para")) return "pharma.product";
  if (t.includes("auto") || t.includes("brake") || t.includes("freno")) return "automotive.component";
  if (t.includes("insul") || t.includes("edil") || t.includes("building")) return "building.insulation";
  if (t.includes("batt") || t.includes("energy")) return "energy.component";
  if (t.includes("cosm") || t.includes("cream")) return "cosmetic.product";
  if (t.includes("tool") || t.includes("drill") || t.includes("hss")) return "industrial.tool";
  if (t.includes("cable") || t.includes("tech") || t.includes("usb")) return "tech.accessory";
  if (t.includes("agri") || t.includes("fert")) return "agri.product";
  return "mechanical.component";
}

/* ===================== HELPERS ===================== */
function toNum(v: string): number | undefined {
  if (v === "" || v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function setAtPath(obj: any, path: (string | number)[], value: any) {
  if (path.length === 0) return value;
  const [k, ...rest] = path;
  return { ...(obj ?? {}), [k]: setAtPath((obj ?? {})[k], rest, value) };
}

function JsonFields({
  data,
  shape,
  onChange,
  path = [],
}: {
  data: any;
  shape: any;
  onChange: (next: any) => void;
  path?: (string | number)[];
}) {
  if (shape === null || typeof shape !== "object" || Array.isArray(shape)) return null; // array non gestiti qui
  const keys = Object.keys(shape);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {keys.map((key) => {
        const example = shape[key];
        const current = data?.[key];

        if (typeof example === "number") {
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={`num-${key}`}>{key}</Label>
              <Input
                id={`num-${key}`}
                inputMode="decimal"
                value={current ?? ""}
                onChange={(e) => onChange(setAtPath(data, [...path, key], toNum(e.target.value)))}
                placeholder={String(example)}
              />
            </div>
          );
        }

        if (typeof example === "boolean") {
          return (
            <div key={key} className="space-y-2">
              <Label>{key}</Label>
              <Select
                value={current === undefined ? "" : current ? "true" : "false"}
                onValueChange={(v) => onChange(setAtPath(data, [...path, key], v === "true"))}
              >
                <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Sì</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        }

        if (typeof example === "string") {
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={`str-${key}`}>{key}</Label>
              <Input
                id={`str-${key}`}
                value={current ?? ""}
                onChange={(e) => onChange(setAtPath(data, [...path, key], e.target.value))}
                placeholder={example}
              />
            </div>
          );
        }

        // nested object
        return (
          <div key={key} className="space-y-2 md:col-span-2">
            <Label>{key}</Label>
            <div className="rounded-md border p-3">
              <JsonFields
                data={current ?? {}}
                shape={example}
                onChange={(next) => onChange(setAtPath(data, [...path, key], next))}
                path={[...path, key]}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ===================== COMPONENTE ===================== */
export default function ProductAttributesForm({ typeId, value, onChange }: Props) {
  const initialPreset = React.useMemo(() => derivePresetFromType(typeId), [typeId]);
  const [preset, setPreset] = React.useState<PresetId>(initialPreset);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const [raw, setRaw] = React.useState<any>(() =>
    value && Object.keys(value).length ? value : PRESETS[initialPreset].example
  );

  // Propaga al padre
  React.useEffect(() => { onChange(raw); }, [raw, onChange]);

  // Cambio typeId → tenta riallineo preset senza perdere input utente
  React.useEffect(() => {
    const nextPreset = derivePresetFromType(typeId);
    if (nextPreset !== preset) {
      const prevExample = PRESETS[preset].example;
      const isEmpty = !raw || Object.keys(raw).length === 0;
      const matchesPrev = JSON.stringify(raw) === JSON.stringify(prevExample);
      setPreset(nextPreset);
      if (isEmpty || matchesPrev) setRaw(PRESETS[nextPreset].example);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId]);

  const applyExample = () => setRaw(PRESETS[preset].example);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Attributi guidati</CardTitle>
          <div className="flex items-center gap-2">
            <div className="min-w-64">
              <Select value={preset} onValueChange={(v) => setPreset(v as PresetId)}>
                <SelectTrigger aria-label="Seleziona template">
                  <SelectValue placeholder="Seleziona template" />
                </SelectTrigger>
                <SelectContent className="max-h-[60vh]">
                  {Object.entries(PRESETS).map(([id, p]) => (
                    <SelectItem key={id} value={id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="secondary" onClick={applyExample}>
              Carica esempio
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <JsonFields data={raw} shape={PRESETS[preset].example} onChange={setRaw} />

        <div className="pt-2">
          <Button variant="secondary" type="button" onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? "Nascondi JSON avanzato" : "Mostra JSON avanzato"}
          </Button>
        </div>

        {showAdvanced && (
          <div className="space-y-2">
            <Label htmlFor="attr-json">Attributi (JSON)</Label>
            <Textarea
              id="attr-json"
              className="font-mono"
              value={JSON.stringify(raw ?? {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value || "{}");
                  setRaw(parsed);
                } catch { /* ignora finché non valido */ }
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
