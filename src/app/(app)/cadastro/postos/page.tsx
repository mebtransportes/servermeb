"use client";

import { Fuel } from "lucide-react";
import { LocalEntityPage } from "@/components/cadastro/local-entity-page";

export default function PostosPage() {
  return (
    <LocalEntityPage
      table="postos"
      title="Postos"
      subtitle="Postos de abastecimento"
      icon={Fuel}
      documentLabel="CNPJ / CPF do posto"
    />
  );
}
