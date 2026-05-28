"use client";

import { Building2 } from "lucide-react";
import { LocalEntityPage } from "@/components/cadastro/local-entity-page";

export default function OficinasPage() {
  return (
    <LocalEntityPage
      table="oficinas"
      title="Oficinas"
      subtitle="Oficinas mecânicas e parceiros"
      icon={Building2}
      documentLabel="CNPJ / CPF da oficina"
    />
  );
}
