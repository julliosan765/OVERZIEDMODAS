import { useStore } from "@/contexts/StoreContext";
import { toMoney } from "@/lib/catalog";
import { hasSupabaseConfiguration, supabase } from "@/lib/supabase";
import { AlertCircle, ArrowLeft, CheckCircle2, CreditCard, Landmark, LockKeyhole, QrCode, ShoppingBag } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";

type PaymentMethod = "pix" | "credit" | "boleto";

export default function CheckoutPage() {
  const { cart, subtotal, clearCart } = useStore();
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [isSubmitted, setSubmitted] = useState(false);
  const [terms, setTerms] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!terms || !cart.length || !supabase) return;
    setSubmitting(true);
    setSubmitError("");
    const fields = new FormData(event.currentTarget);
    const address = [
      fields.get("address"),
      `nº ${fields.get("number")}`,
      fields.get("complement"),
      fields.get("neighborhood"),
    ].filter(Boolean).join(", ");

    try {
      const { data, error } = await supabase.rpc("create_checkout_order", {
        p_customer_name: String(fields.get("name") ?? ""),
        p_customer_email: String(fields.get("email") ?? ""),
        p_customer_phone: String(fields.get("phone") ?? ""),
        p_postal_code: String(fields.get("postalCode") ?? ""),
        p_address: address,
        p_payment_method: method,
        p_items: cart.map((item) => ({ productId: item.id, size: item.size, quantity: item.quantity })),
      });
      if (error || !data?.[0]) throw error ?? new Error("Pedido não retornado");
      setOrderNumber(data[0].order_number);
      clearCart();
      setSubmitted(true);
    } catch {
      setSubmitError("Não foi possível registrar o pedido agora. Confira os dados, o estoque e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!cart.length && !isSubmitted) {
    return <main className="container flex min-h-[65vh] flex-col items-center justify-center py-12 text-center"><ShoppingBag size={35} className="text-[#7affb9]" /><h1 className="mt-4 text-2xl font-bold">Sua sacola está vazia</h1><p className="mt-2 text-sm text-white/55">Adicione produtos para prosseguir ao checkout.</p><Link href="/" className="button-primary mt-6">CONTINUAR COMPRANDO</Link></main>;
  }

  if (isSubmitted) {
    return <main className="container flex min-h-[65vh] flex-col items-center justify-center py-12 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#7affb9]/10 text-[#7affb9]"><CheckCircle2 size={32} /></span><p className="eyebrow mt-6">PEDIDO REGISTRADO</p><h1 className="mt-2 text-3xl font-black">QUASE LÁ!</h1><p className="mt-3 text-sm font-semibold text-[#7affb9]">Pedido {orderNumber}</p><p className="mt-4 max-w-lg text-sm leading-6 text-white/60">Seu pedido foi registrado como pendente. Assim que a plataforma de pagamento for definida e conectada, esta tela exibirá o pagamento seguro por {method === "pix" ? "Pix" : method === "credit" ? "cartão" : "boleto"} e o status será atualizado automaticamente.</p><Link href="/" className="button-primary mt-7">VOLTAR À LOJA</Link></main>;
  }

  return (
    <main className="container py-8 md:py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-[#7affb9]"><ArrowLeft size={16} /> Voltar para a loja</Link>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_.78fr] lg:gap-12">
        <form onSubmit={submit} className="rounded-[1.5rem] border border-white/10 bg-white/[.025] p-5 sm:p-7">
          <p className="eyebrow">FINALIZAÇÃO SEGURA</p><h1 className="mt-2 text-3xl font-black">CHECKOUT</h1>
          <section className="mt-8"><h2 className="text-base font-bold">Seus dados</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="field-label sm:col-span-2">Nome completo<input name="name" required className="field-input" placeholder="Como aparece no documento" /></label><label className="field-label">Telefone<input name="phone" required type="tel" className="field-input" placeholder="(00) 00000-0000" /></label><label className="field-label">E-mail<input name="email" required type="email" className="field-input" placeholder="voce@email.com" /></label></div></section>
          <section className="mt-8 border-t border-white/10 pt-7"><h2 className="text-base font-bold">Entrega</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="field-label">CEP<input name="postalCode" required className="field-input" placeholder="00000-000" /></label><label className="field-label">Número<input name="number" required className="field-input" placeholder="000" /></label><label className="field-label sm:col-span-2">Endereço<input name="address" required className="field-input" placeholder="Rua, avenida ou estrada" /></label><label className="field-label">Complemento<input name="complement" className="field-input" placeholder="Apartamento, bloco..." /></label><label className="field-label">Bairro<input name="neighborhood" required className="field-input" placeholder="Seu bairro" /></label></div></section>
          <section className="mt-8 border-t border-white/10 pt-7"><h2 className="text-base font-bold">Forma de pagamento</h2><div className="mt-4 grid gap-2 sm:grid-cols-3">{([{ id: "pix", icon: QrCode, name: "Pix", note: "Aprovação imediata" }, { id: "credit", icon: CreditCard, name: "Cartão", note: "Em até 3x sem juros" }, { id: "boleto", icon: Landmark, name: "Boleto", note: "Compensação bancária" }] as const).map(({ id, icon: Icon, name, note }) => <button type="button" onClick={() => setMethod(id)} className={`payment-option ${method === id ? "active" : ""}`} key={id}><Icon size={20} /><span><strong>{name}</strong><small>{note}</small></span></button>)}</div><div className="mt-4 flex gap-3 rounded-xl border border-[#7affb9]/15 bg-[#7affb9]/5 p-3 text-xs leading-5 text-white/60"><AlertCircle className="shrink-0 text-[#7affb9]" size={17} /><p>O pedido será registrado agora. O pagamento seguro por Pix, cartão ou boleto será ativado quando a conta do gateway escolhido estiver conectada.</p></div></section>
          <label className="mt-7 flex cursor-pointer gap-3 text-xs leading-5 text-white/55"><input checked={terms} onChange={(event) => setTerms(event.target.checked)} type="checkbox" className="mt-0.5 accent-[#7affb9]" />Li e concordo com os termos de compra, condições de troca e política de privacidade.</label>
          {!hasSupabaseConfiguration && <p role="alert" className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">O checkout estará disponível assim que o Supabase for conectado.</p>}
          {submitError && <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{submitError}</p>}
          <button disabled={!terms || isSubmitting || !hasSupabaseConfiguration} className="button-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-40"><LockKeyhole size={17} /> {isSubmitting ? "REGISTRANDO PEDIDO..." : "REGISTRAR PEDIDO"}</button>
        </form>
        <aside className="h-fit rounded-[1.5rem] border border-white/10 bg-[#11161b] p-5 sm:p-7"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Resumo do pedido</h2><span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/60">{cart.length} item(ns)</span></div><div className="mt-5 divide-y divide-white/10">{cart.map((item) => <div key={`${item.id}-${item.size}`} className="flex gap-3 py-4 first:pt-0"><img src={item.image} alt="" className="h-16 w-14 rounded-lg object-cover object-right" /><div className="flex-1"><p className="text-sm font-semibold leading-5">{item.name}</p><p className="mt-1 text-xs text-white/45">Tam. {item.size} · Qtd. {item.quantity}</p></div><strong className="text-sm">{toMoney(item.price * item.quantity)}</strong></div>)}</div><div className="mt-5 border-t border-white/10 pt-5"><div className="flex justify-between text-sm text-white/55"><span>Subtotal</span><span>{toMoney(subtotal)}</span></div><div className="mt-3 flex justify-between text-sm text-white/55"><span>Frete</span><span>A calcular</span></div><div className="mt-5 flex justify-between text-lg font-bold"><span>Total</span><span>{toMoney(subtotal)}</span></div></div><div className="mt-6 flex items-center gap-2 rounded-xl bg-white/[.035] p-3 text-xs text-white/50"><LockKeyhole size={15} className="text-[#7affb9]" /> Seus dados serão processados no ambiente seguro do gateway escolhido.</div></aside>
      </div>
    </main>
  );
}
