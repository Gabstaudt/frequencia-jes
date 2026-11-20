export type Profile = {
  id: string;
  nome: string;
  email: string;
  data_nascimento: string | null;
  estuda: boolean;
  universidade: string | null;
  estado: string | null;
  is_admin: boolean;
  is_master: boolean;
  created_at: string;
};

export type Frequencia = {
  id: string;
  nome: string;
  dia: number;
  marcacao: number;
  palavra_chave: string;
  desbloqueio_em: string;
  fechada: boolean;
  created_at: string;
};

/** Frequência sem a palavra-chave: é o que pode chegar ao navegador do participante. */
export type FrequenciaPublica = Omit<Frequencia, "palavra_chave">;

export type Presenca = {
  id: string;
  frequencia_id: string;
  user_id: string;
  origem: "palavra" | "manual";
  marcado_por: string | null;
  created_at: string;
};

export type Regra = "soma" | "percentual" | "minimo";

export type Config = {
  id: number;
  evento_nome: string;
  horas_por_dia: number;
  regra: Regra;
  regra_percentual: number;
  certificados_liberados: boolean;
  liberados_em: string | null;
};

export type BlocoTexto = {
  id: string;
  /** Texto com campos, ex.: "Certificamos que {{nome}} participou..." */
  texto: string;
  /** Posição e largura em % da página (0–100). y = topo do bloco. */
  x: number;
  y: number;
  largura: number;
  /** Tamanho da fonte em pontos numa página A4 (842 pt de largura em paisagem). */
  tamanho: number;
  alinhamento: "esquerda" | "centro" | "direita";
  fonte: "helvetica" | "times" | "courier";
  negrito: boolean;
  cor: string;
};

export type BlocoQr = { x: number; y: number; tamanho: number; ativo: boolean };

export type ModeloCertificado = {
  id: string;
  tipo: string;
  imagem_path: string | null;
  imagem_largura: number | null;
  imagem_altura: number | null;
  blocos: BlocoTexto[];
  qr: BlocoQr;
  updated_at: string;
};

export type PessoaExtra = {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  horas: number;
  created_at: string;
};

export type Certificado = {
  id: string;
  codigo: string;
  tipo: string;
  nome: string;
  email: string;
  user_id: string | null;
  pessoa_extra_id: string | null;
  horas: number;
  emitido_em: string;
  invalidado: boolean;
  invalidado_em: string | null;
};
