import ProductCard from "@/components/ProductCard";
import { useStore } from "@/contexts/StoreContext";
import { useCatalog } from "@/hooks/useCatalog";
import { categorySlug, products as fallbackProducts, toMoney } from "@/lib/catalog";
import { Link, useRoute } from "wouter";
import { ChevronRight, Minus, Plus, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useState } from "react";

export default function ProductPage() {
  const [, params] = useRoute("/produto/:slug");
  const { products } = useCatalog();
  const product = products.find((item) => item.slug === params?.slug) || products[0] || fallbackProducts[0];
  const [size, setSize] = useState(product.sizes[0]);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useStore();
  const related = products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4);
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : null;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Olá! Tenho interesse em ${product.name}, tamanho ${size}.`)}`;

  function addItems() {
    for (let index = 0; index < quantity; index += 1) addToCart(product, size);
  }

  return (
    <main className="container py-8 md:py-12">
      <div className="flex items-center gap-1.5 text-xs text-white/45">
        <Link href="/" className="hover:text-[#7affb9]">Início</Link>
        <ChevronRight size={14} />
        <Link href={`/categoria/${categorySlug(product.category)}`} className="hover:text-[#7affb9]">{product.category}</Link>
        <ChevronRight size={14} />
        <span className="max-w-36 truncate sm:max-w-none">{product.name}</span>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.04fr_.96fr] lg:gap-14">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[72px_1fr]">
          <div className="hidden gap-3 sm:flex sm:flex-col">
            <button className="overflow-hidden rounded-xl border border-[#7affb9] p-0.5">
              <img src={product.image} alt="Miniatura do produto" className="aspect-square w-full rounded-[9px] object-cover object-right" />
            </button>
            <button className="overflow-hidden rounded-xl border border-white/10 opacity-55 transition hover:opacity-100">
              <img src={product.image} alt="Outra visualização do produto" className="aspect-square w-full rounded-xl object-cover object-center grayscale" />
            </button>
          </div>
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#13191d]">
            <img src={product.image} alt={product.name} className="aspect-square w-full object-cover object-right" style={{ filter: `hue-rotate(${product.id * 22}deg) saturate(${0.72 + product.id / 20})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            {discount && <span className="badge-discount">-{discount}%</span>}
            {product.badge && <span className="badge-new">{product.badge}</span>}
          </div>
        </div>

        <section className="lg:pt-3">
          <p className="eyebrow text-[#7affb9]">OVERZIED MODAS / {product.category.toUpperCase()}</p>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight md:text-[42px]">{product.name}</h1>
          <div className="mt-6 flex items-end gap-3">
            {product.oldPrice && <span className="text-base text-white/40 line-through">{toMoney(product.oldPrice)}</span>}
            <strong className="text-3xl text-white">{toMoney(product.price)}</strong>
          </div>
          <p className="mt-2 text-sm text-white/50">ou 3x de {toMoney(product.price / 3)} sem juros</p>
          <p className="mt-6 max-w-xl text-sm leading-7 text-white/65">{product.description}</p>

          <div className="mt-7">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-white/65">Tamanho <span className="text-[#7affb9]">— {size}</span></p>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.sizes.map((option) => (
                <button key={option} onClick={() => setSize(option)} className={`size-button detail-size ${size === option ? "selected" : ""}`}>{option}</button>
              ))}
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <div className="quantity-stepper h-12">
              <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Diminuir quantidade"><Minus size={15} /></button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity((value) => value + 1)} aria-label="Aumentar quantidade"><Plus size={15} /></button>
            </div>
            <button onClick={addItems} className="button-primary flex-1 sm:flex-none"><ShoppingBag size={17} /> ADICIONAR AO CARRINHO</button>
          </div>
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="button-whatsapp mt-3"><FaWhatsapp aria-hidden="true" size={19} /> COMPRAR PELO WHATSAPP</a>
          <div className="mt-7 grid gap-3 border-t border-white/10 pt-6 text-sm text-white/60">
            <p className="flex items-center gap-2"><Truck size={17} className="text-[#7affb9]" /> Envio para todo o Brasil</p>
            <p className="flex items-center gap-2"><ShieldCheck size={17} className="text-[#7affb9]" /> Compra segura e trocas em até 7 dias</p>
          </div>
        </section>
      </div>

      {related.length > 0 && (
        <section className="mt-20 border-t border-white/10 pt-12">
          <p className="eyebrow">VOCÊ TAMBÉM PODE GOSTAR</p>
          <h2 className="section-title mt-2">MAIS DA COLEÇÃO</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
        </section>
      )}
    </main>
  );
}
