"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  AddressFields,
  emptyAddress,
  type AddressValues,
} from "@/components/forms/address-fields";
import { buildMapsLink } from "@/lib/utils";
import type { EnderecoEntidade, TipoPessoa } from "@/types";

type TableName =
  | "postos"
  | "oficinas"
  | "clientes"
  | "fornecedores";

type LocalEntityFormProps = {
  table: TableName;
  entity?: EnderecoEntidade & { id: string };
  documentLabel?: string;
  showObservacoes?: boolean;
  onSaved: () => void;
  onCancel: () => void;
};

export function LocalEntityForm({
  table,
  entity,
  documentLabel = "CNPJ / CPF",
  showObservacoes = false,
  onSaved,
  onCancel,
}: LocalEntityFormProps) {
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>(
    entity?.tipo_pessoa ?? "PJ"
  );
  const [nome, setNome] = useState(entity?.nome ?? "");
  const [documento, setDocumento] = useState(entity?.documento ?? "");
  const [telefone, setTelefone] = useState(entity?.telefone ?? "");
  const [observacoes, setObservacoes] = useState(entity?.observacoes ?? "");
  const [address, setAddress] = useState<AddressValues>({
    ...emptyAddress,
    cep: entity?.cep ?? "",
    cidade: entity?.cidade ?? "",
    estado: entity?.estado ?? "",
    logradouro: entity?.logradouro ?? "",
    numero: entity?.numero ?? "",
    bairro: entity?.bairro ?? "",
    local_proximo: entity?.local_proximo ?? "",
    complemento: entity?.complemento ?? "",
    latitude: entity?.latitude?.toString() ?? "",
    longitude: entity?.longitude?.toString() ?? "",
    maps_link: entity?.maps_link ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setAddr(field: keyof AddressValues, value: string) {
    setAddress((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const lat = address.latitude ? parseFloat(address.latitude) : null;
    const lng = address.longitude ? parseFloat(address.longitude) : null;
    const mapsLink =
      address.maps_link || buildMapsLink(lat ?? undefined, lng ?? undefined);

    const payload = {
      tipo_pessoa: tipoPessoa,
      nome,
      documento: documento || null,
      telefone: telefone || null,
      cep: address.cep || null,
      cidade: address.cidade || null,
      estado: address.estado || null,
      logradouro: address.logradouro || null,
      numero: address.numero || null,
      bairro: address.bairro || null,
      local_proximo: address.local_proximo || null,
      complemento: address.complemento || null,
      latitude: lat,
      longitude: lng,
      maps_link: mapsLink || null,
      ...(showObservacoes ? { observacoes: observacoes || null } : {}),
      created_by: user?.id,
    };

    let errMsg: string | null = null;

    if (entity?.id) {
      const { error: err } = await supabase
        .from(table)
        .update(payload)
        .eq("id", entity.id);
      if (err) errMsg = err.message;
    } else {
      const insertPayload =
        table === "clientes" || table === "fornecedores"
          ? { ...payload, documento: documento }
          : payload;
      const { error: err } = await supabase.from(table).insert(insertPayload);
      if (err) errMsg = err.message;
    }

    setSaving(false);
    if (errMsg) {
      setError(errMsg);
      return;
    }
    onSaved();
  }

  const requiresDoc = table === "clientes" || table === "fornecedores";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          label="Tipo de pessoa"
          value={tipoPessoa}
          onChange={(e) => setTipoPessoa(e.target.value as TipoPessoa)}
          options={[
            { value: "PJ", label: "Pessoa Jurídica" },
            { value: "PF", label: "Pessoa Física" },
          ]}
        />
        <Input
          label={documentLabel}
          value={documento}
          onChange={(e) => setDocumento(e.target.value)}
          required={requiresDoc}
        />
        <Input
          label="Nome / Razão social"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          className="sm:col-span-2"
        />
        <Input
          label="Telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
      </div>

      <AddressFields
        values={address}
        onChange={setAddr}
        nome={nome}
        telefone={telefone}
      />

      {showObservacoes && (
        <Textarea
          label="Observações"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Informações adicionais..."
        />
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : entity ? "Atualizar" : "Cadastrar"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
