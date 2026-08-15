import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useSupabaseOrders, useSupabaseProducts } from "@/hooks/useSupabaseAdmin";
import { categories, Category, toMoney } from "@/lib/catalog";
import { hasSupabaseConfiguration, supabase } from "@/lib/supabase";
import type { SupabaseProduct } from "@/lib/supabaseTypes";
import { AlertCircle, Boxes, ClipboardList, Loader2, PackagePlus, Pencil, ShieldAlert, Trash2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link } from "wouter";

type ProductForm = {
  name: string; slug: string; category: Category; description: string; price: string; compareAtPrice: string;
  sizes: string; imageUrl: string; badge: string; accentColor: string; stock: string; isActive: boolean;
};

const emptyForm: ProductForm = { name: "", slug: "", category: "Camisetas", description: "", price: "", compareAtPrice: "", sizes: "P, M, G, GG", imageUrl: "", badge: "", accentColor: "#82ffc5", stock: "0", isActive: true };
const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const asCents = (value: string) => Math.round(Number(value.replace(".", "").replace(",", ".")) * 100);

function toForm(product: SupabaseProduct): ProductForm {
  return {
    name: product.name, slug: product.slug, category: product.category as Category, description: product.description,
    price: (product.price_cents / 100).toFixed(2).replace(".", ","),
    compareAtPrice: product.compare_at_price_cents ? (product.compare_at_price_cents / 100).toFixed(2).replace(".", ",") : "",
    sizes: Array.isArray(product.sizes) ? product.sizes.join(", ") : String(product.sizes ?? ""),
    imageUrl: product.image_url, badge: product.badge ?? "", accentColor: product.accent_color, stock: String(product.stock), isActive: product.is_active,
  };
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#080909]" />;
  if (!hasSupabaseConfiguration) return <ConfigurationNotice />;
  if (!user) return <LoginNotice />;
  if (user.role !== "admin") return <AccessDenied />;
  return <DashboardLayout><AdminConsole /></DashboardLayout>;
}

function ConfigurationNotice() {
  return <main className="grid min-h-screen place-items-center bg-[#080909] px-5 text-center text-white"><section className="max-w-lg rounded-3xl border border-white/10 bg-white/[.04] p-8"><Boxes className="mx-auto text-[#82ffc5]" size={38} /><p className="mt-5 text-xs font-bold tracking-[.2em] text-[#82ffc5]">PAINEL EM CONFIGURAÇÃO</p><h1 className="mt-2 font-display text-3xl">Conecte o Supabase para administrar a loja</h1><p className="mt-4 text-sm leading-6 text-white/60">Adicione a URL do projeto e a publishable key nas configurações seguras. Nunca use a chave service_role no navegador.</p><Link href="/"><Button className="mt-7 bg-white text-black hover:bg-[#82ffc5]">VOLTAR PARA A LOJA</Button></Link></section></main>;
}

function LoginNotice() {
  return <main className="grid min-h-screen place-items-center bg-[#080909] px-5 text-center text-white"><section className="max-w-md rounded-3xl border border-white/10 bg-white/[.04] p-8"><ShieldAlert className="mx-auto text-[#82ffc5]" size={38} /><h1 className="mt-5 font-display text-3xl">Área administrativa</h1><p className="mt-3 text-sm leading-6 text-white/60">Entre com a conta Google autorizada como administradora no Supabase.</p><Button onClick={() => void startLogin()} className="mt-7 bg-[#82ffc5] text-black hover:bg-white">ENTRAR COM GOOGLE</Button></section></main>;
}

function AccessDenied() {
  return <main className="grid min-h-screen place-items-center bg-[#080909] px-5 text-center text-white"><section className="max-w-md rounded-3xl border border-red-300/20 bg-red-300/[.04] p-8"><ShieldAlert className="mx-auto text-red-300" size={38} /><h1 className="mt-5 font-display text-3xl">Acesso restrito</h1><p className="mt-3 text-sm leading-6 text-white/60">Esta conta não possui a permissão de administrador da Overzied Modas.</p><Link href="/"><Button variant="outline" className="mt-7 border-white/20 text-white hover:bg-white/10">VOLTAR PARA A LOJA</Button></Link></section></main>;
}

function AdminConsole() {
  const catalog = useSupabaseProducts(true);
  const operations = useSupabaseOrders();
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const stockCount = useMemo(() => catalog.products.reduce((total, product) => total + product.stock, 0), [catalog.products]);

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const reset = () => { setForm(emptyForm); setEditingId(null); };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setSaving(true); setFeedback(null);
    const product = {
      name: form.name.trim(), slug: form.slug.trim() || slugify(form.name), category: form.category, description: form.description.trim(),
      price_cents: asCents(form.price), compare_at_price_cents: form.compareAtPrice ? asCents(form.compareAtPrice) : null,
      sizes: form.sizes.split(",").map((size) => size.trim()).filter(Boolean), image_url: form.imageUrl.trim(), badge: form.badge.trim() || null,
      accent_color: form.accentColor.trim() || "#82ffc5", stock: Math.max(0, Number.parseInt(form.stock, 10) || 0), is_active: form.isActive,
    };
    const { error } = editingId ? await supabase.from("products").update(product).eq("id", editingId) : await supabase.from("products").insert(product);
    if (error) setFeedback(error.message);
    else { setFeedback(editingId ? "Produto atualizado." : "Produto cadastrado."); reset(); await catalog.refresh(); }
    setSaving(false);
  };

  const remove = async (product: SupabaseProduct) => {
    if (!supabase || !window.confirm(`Remover ${product.name}?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    setFeedback(error ? error.message : "Produto removido.");
    await catalog.refresh();
  };

  return <div className="mx-auto max-w-7xl space-y-8 pb-10 text-white"><header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6"><div><p className="text-xs font-bold tracking-[.2em] text-[#82ffc5]">OVERZIED MODAS</p><h1 className="mt-2 font-display text-4xl">Administração</h1><p className="mt-2 text-sm text-white/55">Catálogo e pedidos protegidos por políticas do Supabase.</p></div><Link href="/"><Button variant="outline" className="border-white/20 text-white hover:bg-white/10">VER LOJA</Button></Link></header>
    <section className="grid gap-4 md:grid-cols-3"><Stat icon={<Boxes size={18} />} label="PRODUTOS" value={catalog.loading ? "—" : String(catalog.products.length)} /><Stat icon={<ClipboardList size={18} />} label="PEDIDOS PENDENTES" value={operations.loading ? "—" : String(operations.orders.filter((order) => order.payment_status === "pending").length)} /><Stat icon={<PackagePlus size={18} />} label="PEÇAS EM ESTOQUE" value={catalog.loading ? "—" : String(stockCount)} /></section>
    <section className="grid gap-8 xl:grid-cols-[410px_1fr]"><form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/[.035] p-6"><div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-bold tracking-[.18em] text-[#82ffc5]">CATÁLOGO</p><h2 className="mt-1 font-display text-2xl">{editingId ? "Editar produto" : "Novo produto"}</h2></div>{editingId && <Button type="button" onClick={reset} variant="ghost" className="text-white hover:bg-white/10">CANCELAR</Button>}</div><div className="grid gap-4"><Field label="Nome"><input required value={form.name} onChange={(event) => set("name", event.target.value)} className="admin-input" /></Field><Field label="Slug"><input value={form.slug} onChange={(event) => set("slug", event.target.value)} className="admin-input" placeholder="Gerado pelo nome se vazio" /></Field><Field label="Categoria"><select value={form.category} onChange={(event) => set("category", event.target.value as Category)} className="admin-input">{categories.map((category) => <option className="bg-zinc-950" key={category}>{category}</option>)}</select></Field><Field label="Descrição"><textarea required value={form.description} onChange={(event) => set("description", event.target.value)} className="admin-input min-h-24 py-2" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Preço"><input required value={form.price} onChange={(event) => set("price", event.target.value)} inputMode="decimal" className="admin-input" placeholder="89,90" /></Field><Field label="Preço anterior"><input value={form.compareAtPrice} onChange={(event) => set("compareAtPrice", event.target.value)} inputMode="decimal" className="admin-input" /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Tamanhos"><input required value={form.sizes} onChange={(event) => set("sizes", event.target.value)} className="admin-input" /></Field><Field label="Estoque"><input required type="number" min="0" value={form.stock} onChange={(event) => set("stock", event.target.value)} className="admin-input" /></Field></div><Field label="URL da imagem"><input required type="url" value={form.imageUrl} onChange={(event) => set("imageUrl", event.target.value)} className="admin-input" placeholder="https://..." /></Field><div className="grid grid-cols-2 gap-3"><Field label="Selo"><input value={form.badge} onChange={(event) => set("badge", event.target.value)} className="admin-input" placeholder="NOVO" /></Field><Field label="Cor de destaque"><input value={form.accentColor} onChange={(event) => set("accentColor", event.target.value)} className="admin-input" /></Field></div><label className="flex items-center gap-3 text-sm text-white/70"><input type="checkbox" checked={form.isActive} onChange={(event) => set("isActive", event.target.checked)} /> Produto visível na loja</label>{feedback && <p className="rounded-lg bg-white/5 p-3 text-sm text-white/75">{feedback}</p>}<Button disabled={saving} className="bg-[#82ffc5] text-black hover:bg-white">{saving && <Loader2 className="mr-2 animate-spin" size={16} />}{editingId ? "SALVAR ALTERAÇÕES" : "CADASTRAR PRODUTO"}</Button></div></form>
      <div className="space-y-8"><section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.035]"><div className="border-b border-white/10 px-6 py-5"><p className="text-xs font-bold tracking-[.18em] text-[#82ffc5]">PRODUTOS</p><h2 className="mt-1 font-display text-2xl">Catálogo</h2></div>{catalog.error ? <ErrorText message={catalog.error} /> : <div className="divide-y divide-white/10">{catalog.products.map((product) => <div key={product.id} className="flex flex-wrap items-center gap-4 px-6 py-4"><img src={product.image_url} alt="" className="h-14 w-12 rounded-lg bg-black/30 object-cover" /><div className="min-w-40 flex-1"><p className="font-medium">{product.name}</p><p className="mt-1 text-xs text-white/45">{product.category} · {product.stock} em estoque · {product.is_active ? "Ativo" : "Oculto"}</p></div><p className="text-sm">{toMoney(product.price_cents / 100)}</p><Button type="button" onClick={() => { setForm(toForm(product)); setEditingId(product.id); window.scrollTo({ top: 0, behavior: "smooth" }); }} variant="ghost" size="icon" className="text-white hover:bg-white/10"><Pencil size={16} /></Button><Button type="button" onClick={() => void remove(product)} variant="ghost" size="icon" className="text-red-300 hover:bg-red-300/10 hover:text-red-200"><Trash2 size={16} /></Button></div>)}{!catalog.loading && catalog.products.length === 0 && <Empty message="Nenhum produto cadastrado no Supabase." />}</div>}</section>
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.035]"><div className="border-b border-white/10 px-6 py-5"><p className="text-xs font-bold tracking-[.18em] text-[#82ffc5]">PEDIDOS</p><h2 className="mt-1 font-display text-2xl">Acompanhamento</h2></div>{operations.error ? <ErrorText message={operations.error} /> : <div className="divide-y divide-white/10">{operations.orders.map((order) => <div key={order.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-4 text-sm"><div className="min-w-36"><p className="font-medium">{order.order_number}</p><p className="mt-1 text-xs text-white/45">{new Date(order.created_at).toLocaleDateString("pt-BR")}</p></div><p className="min-w-40 flex-1 text-white/65">{order.customer_name}</p><p className="rounded-full border border-white/10 px-2.5 py-1 text-xs capitalize text-white/70">{order.payment_status}</p><p>{toMoney(order.total_cents / 100)}</p></div>)}{!operations.loading && operations.orders.length === 0 && <Empty message="Nenhum pedido registrado." />}</div>}</section></div></section></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm text-white/70"><span>{label}</span>{children}</label>; }
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className="flex items-center gap-3 text-[#82ffc5]">{icon}<p className="text-xs font-bold tracking-[.16em]">{label}</p></div><p className="mt-4 font-display text-4xl">{value}</p></div>; }
function Empty({ message }: { message: string }) { return <p className="p-6 text-sm text-white/50">{message}</p>; }
function ErrorText({ message }: { message: string }) { return <p className="flex gap-2 p-6 text-sm text-red-300"><AlertCircle size={16} />{message}</p>; }
