"use client";

import { Package } from "lucide-react";
import { LocalEntityPage } from "@/components/cadastro/local-entity-page";

export default function FornecedoresPage() {
  return (
    <LocalEntityPage
      table="fornecedores"
      title="Fornecedores"
      subtitle="Cadastro de fornecedores"
      icon={Package}
      documentLabel="CNPJ / CPF"
      showObservacoes
    />
  );
}
