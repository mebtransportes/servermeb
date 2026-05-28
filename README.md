# MEB — Gestão de Transporte

Sistema web de gestão de transporte com Next.js e Supabase.

## Configuração

### 1. Variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha:

- `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — chave **anon** (publishable) do painel **Settings → API**

> **Nunca** use a chave `service_role` no frontend. Ela ignora o RLS e expõe todo o banco.

### 2. Banco de dados

No [SQL Editor](https://aearkstgzdhnzaubneem.supabase.co) do Supabase, execute o arquivo:

- `supabase/migrations/001_meb_transport.sql`
- `supabase/migrations/002_profiles_trigger_and_backfill.sql`
- `supabase/migrations/003_viagens_operacional.sql`
- `supabase/migrations/004_frota.sql`

### 3. Usuários (3 contas, senha padrão `123`)

No painel **Authentication → Users**, crie 3 usuários com e-mails fictícios (exemplo):

| E-mail (Auth)        | Nome de usuário (login) |
|----------------------|-------------------------|
| admin@meb.local      | admin                   |
| operador1@meb.local  | operador1               |
| operador2@meb.local  | operador2               |

Senha inicial: `123` (marque "Auto Confirm User").

Depois, no SQL Editor, vincule os perfis (substitua os UUIDs pelos IDs reais dos usuários em Authentication):

```sql
INSERT INTO public.profiles (id, username, auth_email) VALUES
  ('UUID-DO-USER-1', 'admin', 'admin@meb.local'),
  ('UUID-DO-USER-2', 'operador1', 'operador1@meb.local'),
  ('UUID-DO-USER-3', 'operador2', 'operador2@meb.local');
```

### 4. Rodar o projeto

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Módulos

- **Operacional**
  - Cadastro de Viagens — validação CNH/toxicológico/CRLV, múltiplos locais de entrega, anexos
  - Acompanhamento — status da viagem, recursos (abastecimento, manutenção, outro) com comprovantes
- **Frota**
  - Manutenção — kanban (Agendado / Em andamento / Finalizado), drag-and-drop, preventivas + viagens
  - Abastecimentos — cards, manual com KM, integração com viagens
  - Documentação / Relatórios — em breve
- **Dashboard / Financeiro** — estrutura pronta (conteúdo em breve)
- **Cadastro**
  - Veículos — CRLV, IPVA, financiamento, campos customizados, PDFs
  - Motoristas — CNH, toxicológico, idade automática, PDFs
  - Postos / Oficinas — endereço com CEP, localização Maps, copiar para WhatsApp
  - Clientes / Fornecedores — documento, endereço, observações

## Login

- Entrada por **nome de usuário** e senha (sem cadastro público)
- Alteração de usuário e senha em **Minha conta**
