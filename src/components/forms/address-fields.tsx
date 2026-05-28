"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchCep, buildMapsLink, buildEnderecoCompleto } from "@/lib/utils";
import { Copy, MapPin } from "lucide-react";

export type AddressValues = {
  cep: string;
  cidade: string;
  estado: string;
  logradouro: string;
  numero: string;
  bairro: string;
  local_proximo: string;
  complemento: string;
  latitude: string;
  longitude: string;
  maps_link: string;
};

type AddressFieldsProps = {
  values: AddressValues;
  onChange: (field: keyof AddressValues, value: string) => void;
  nome?: string;
  telefone?: string;
};

export function AddressFields({
  values,
  onChange,
  nome,
  telefone,
}: AddressFieldsProps) {
  const [loadingCep, setLoadingCep] = useState(false);

  async function handleCepBlur() {
    setLoadingCep(true);
    const data = await fetchCep(values.cep);
    setLoadingCep(false);
    if (data) {
      onChange("logradouro", data.logradouro || "");
      onChange("bairro", data.bairro || "");
      onChange("cidade", data.cidade || "");
      onChange("estado", data.estado || "");
    }
  }

  function updateMapsLink(lat: string, lng: string) {
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    if (!isNaN(latN) && !isNaN(lngN)) {
      onChange("maps_link", buildMapsLink(latN, lngN));
    }
  }

  function handleLatLngChange(field: "latitude" | "longitude", value: string) {
    onChange(field, value);
    const lat = field === "latitude" ? value : values.latitude;
    const lng = field === "longitude" ? value : values.longitude;
    updateMapsLink(lat, lng);
  }

  const textoCompleto = buildEnderecoCompleto({
    nome,
    logradouro: values.logradouro,
    numero: values.numero,
    bairro: values.bairro,
    cidade: values.cidade,
    estado: values.estado,
    cep: values.cep,
    complemento: values.complemento,
    localProximo: values.local_proximo,
    telefone,
    mapsLink: values.maps_link,
  });

  return (
    <div className="space-y-4 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
      <h3 className="text-sm font-semibold text-cyan-400">Endereço e localização</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          label={`CEP ${loadingCep ? "(buscando...)" : ""}`}
          name="cep"
          value={values.cep}
          onChange={(e) => onChange("cep", e.target.value)}
          onBlur={handleCepBlur}
          placeholder="00000-000"
        />
        <Input
          label="Cidade"
          name="cidade"
          value={values.cidade}
          onChange={(e) => onChange("cidade", e.target.value)}
          readOnly
        />
        <Input
          label="Estado"
          name="estado"
          value={values.estado}
          onChange={(e) => onChange("estado", e.target.value)}
          readOnly
        />
        <Input
          label="Logradouro"
          name="logradouro"
          value={values.logradouro}
          onChange={(e) => onChange("logradouro", e.target.value)}
          className="sm:col-span-2"
        />
        <Input
          label="Número"
          name="numero"
          value={values.numero}
          onChange={(e) => onChange("numero", e.target.value)}
        />
        <Input
          label="Bairro"
          name="bairro"
          value={values.bairro}
          onChange={(e) => onChange("bairro", e.target.value)}
        />
        <Input
          label="Local próximo"
          name="local_proximo"
          value={values.local_proximo}
          onChange={(e) => onChange("local_proximo", e.target.value)}
          className="sm:col-span-2"
        />
        <Input
          label="Complemento"
          name="complemento"
          value={values.complemento}
          onChange={(e) => onChange("complemento", e.target.value)}
        />
        <Input
          label="Latitude"
          name="latitude"
          type="number"
          step="any"
          value={values.latitude}
          onChange={(e) => handleLatLngChange("latitude", e.target.value)}
          placeholder="-23.550520"
        />
        <Input
          label="Longitude"
          name="longitude"
          type="number"
          step="any"
          value={values.longitude}
          onChange={(e) => handleLatLngChange("longitude", e.target.value)}
          placeholder="-46.633308"
        />
      </div>

      {values.maps_link && (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={values.maps_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
          >
            <MapPin className="h-4 w-4" />
            Abrir no Google Maps
          </a>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigator.clipboard.writeText(values.maps_link)}
          >
            <Copy className="h-4 w-4" />
            Copiar link
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigator.clipboard.writeText(textoCompleto)}
          >
            <Copy className="h-4 w-4" />
            Copiar info completa (WhatsApp)
          </Button>
        </div>
      )}
    </div>
  );
}

export const emptyAddress: AddressValues = {
  cep: "",
  cidade: "",
  estado: "",
  logradouro: "",
  numero: "",
  bairro: "",
  local_proximo: "",
  complemento: "",
  latitude: "",
  longitude: "",
  maps_link: "",
};
