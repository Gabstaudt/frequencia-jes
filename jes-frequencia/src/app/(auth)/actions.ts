"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { caminhoSeguro } from "@/lib/auth";
import { getOrigin } from "@/lib/site";
import { ESTADOS } from "@/lib/frequencia";

export type FormState = { erro?: string; ok?: string };

function texto(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

export async function entrar(_: FormState, fd: FormData): Promise<FormState> {
  const email = texto(fd, "email").toLowerCase();
  const senha = String(fd.get("senha") ?? "");
  const next = caminhoSeguro(texto(fd, "next"));
  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    if (error.code === "email_not_confirmed" || /not confirmed/i.test(error.message)) {
      return { erro: "Seu e-mail ainda não foi confirmado. Abra o link que enviamos (veja também o spam)." };
    }
    return { erro: "E-mail ou senha incorretos." };
  }
  redirect(next);
}

export async function cadastrar(_: FormState, fd: FormData): Promise<FormState> {
  const nome = texto(fd, "nome").replace(/\s+/g, " ");
  const email = texto(fd, "email").toLowerCase();
  const senha = String(fd.get("senha") ?? "");
  const nascimento = texto(fd, "data_nascimento");
  const estuda = texto(fd, "estuda") === "sim";
  let universidade = texto(fd, "universidade");
  const outra = texto(fd, "universidade_outra");
  const estado = texto(fd, "estado");
  const aceite = fd.get("aceite") === "on";
  const next = caminhoSeguro(texto(fd, "next"));

  if (nome.split(" ").length < 2) return { erro: "Informe seu nome completo (como deve sair no certificado)." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { erro: "Informe um e-mail válido." };
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) return { erro: "Informe sua data de nascimento." };
  if (!ESTADOS.includes(estado)) return { erro: "Selecione seu estado de residência." };
  if (estuda) {
    if (universidade === "Outra") universidade = outra;
    if (!universidade) return { erro: "Informe sua universidade." };
  } else {
    universidade = "";
  }
  if (!aceite) return { erro: "É preciso aceitar os termos para criar a conta." };

  const origin = await getOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      data: {
        nome,
        data_nascimento: nascimento,
        estuda,
        universidade,
        estado,
        aceite_termos: aceite,
      },
    },
  });
  if (error) {
    if (/registered|exists/i.test(error.message)) return { erro: "Já existe uma conta com este e-mail. Tente entrar." };
    if (/password/i.test(error.message)) return { erro: "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números." };
    return { erro: "Não foi possível criar a conta agora. Tente de novo em instantes." };
  }
  // Supabase devolve um usuário sem identidades quando o e-mail já existe.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { erro: "Já existe uma conta com este e-mail. Tente entrar." };
  }
  redirect(`/cadastro/verifique-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
}

export async function reenviarConfirmacao(_: FormState, fd: FormData): Promise<FormState> {
  const email = texto(fd, "email").toLowerCase();
  const next = caminhoSeguro(texto(fd, "next"));
  if (!email) return { erro: "E-mail não informado." };
  const origin = await getOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  if (error) return { erro: "Não foi possível reenviar agora. Aguarde um minuto e tente de novo." };
  return { ok: "Enviamos o e-mail de novo." };
}

export async function esqueciSenha(_: FormState, fd: FormData): Promise<FormState> {
  const email = texto(fd, "email").toLowerCase();
  if (!email) return { erro: "Informe seu e-mail." };
  const origin = await getOrigin();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/redefinir-senha`,
  });
  // Mesma resposta sempre, para não revelar quais e-mails têm conta.
  return { ok: "Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha." };
}

export async function redefinirSenha(_: FormState, fd: FormData): Promise<FormState> {
  const senha = String(fd.get("senha") ?? "");
  const confirmar = String(fd.get("confirmar") ?? "");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (senha !== confirmar) return { erro: "As senhas não são iguais." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { erro: "Não foi possível trocar a senha. Peça um novo link de recuperação." };
  redirect("/inicio?senha=ok");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
