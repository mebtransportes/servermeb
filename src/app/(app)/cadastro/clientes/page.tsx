"use client";

import { UserCircle } from "lucide-react";
import { LocalEntityPage } from "@/components/cadastro/local-entity-page";

export default function ClientesPage() {
  return (
    <LocalEntityPage
      table="clientes"
      title="Clientes"
      subtitle="Cadastro de clientes"
      icon={UserCircle}
      documentLabel="CNPJ / CPF"
      showObservacoes
    />
  );
}
