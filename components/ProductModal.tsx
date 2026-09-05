'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { isInternalCategory, type CatalogProduct } from '@/lib/catalog';
import { getProductVideoEmbed } from '@/lib/video';
import { getVariantGroup, resolveVariantPrice, type VariantOption } from '@/lib/variants';
import type { ConfiguredCartLine, VariantCartLine } from '@/lib/cart';
import type { OptionGroup, ProductOption } from '@/lib/options';
import { protectedImageProps, IMAGE_LOCK_STYLE } from '@/lib/image-protection';
import ProductConfigurator from '@/components/ProductConfigurator';
import VariantPicker from '@/components/VariantPicker';

function clampPan(pan: { x: number; y: number }, zoom: number) {
  const max = (zoom - 1) * 160;
  return { x: Math.min(max, Math.max(-max, pan.x)), y: Math.min(max, Math.max(-max, pan.y)) };
}

export default function ProductModal({
  product,
  imagesLocked,
  groups,
  options,
  quantity,
  editingVariantLine,
  editingConfiguredLine,
  onClose,
  onQuantityChange,
  onAddConfigured,
  onAddVariant,
  onAddSimple,
}: {
  product: CatalogProduct;
  imagesLocked: boolean;
  groups: OptionGroup[];
  options: ProductOption[];
  quantity: number;
  editingVariantLine?: VariantCartLine;
  editingConfiguredLine?: ConfiguredCartLine;
  onClose: () => void;
  onQuantityChange: (delta: number) => void;
  onAddConfigured: (configuration: ConfiguredCartLine['configuration'], unitPrice: number, qty: number) => void;
  onAddVariant: (option: VariantOption, qty: number) => void;
  onAddSimple: () => void;
}) {
  // zoom+pan live in one state object so the wheel handler below can update
  // both in a single, pure setState call (see react-doctor/no-impure-state-updater).
  const [imageView, setImageView] = useState({ zoom: 1, pan: { x: 0, y: 0 } });
  const [isPanningImage, setIsPanningImage] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const productImageRef = useRef<HTMLDivElement>(null);
  const closedViaBackRef = useRef(false);

  useEffect(() => {
    setImageView({ zoom: 1, pan: { x: 0, y: 0 } });
  }, [product]);

  useEffect(() => {
    const el = productImageRef.current;
    if (!el) return;
    // React attaches onWheel as a passive listener by default, which silently
    // ignores preventDefault() — attach natively so zooming doesn't also scroll the page.
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setImageView((view) => {
        const nextZoom = Math.min(4, Math.max(1, view.zoom - event.deltaY * 0.0015));
        return { zoom: nextZoom, pan: nextZoom === 1 ? { x: 0, y: 0 } : clampPan(view.pan, nextZoom) };
      });
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [product]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    // Push a history entry so the phone's back button closes the modal
    // instead of navigating away from the site entirely.
    const onPopState = () => {
      closedViaBackRef.current = true;
      onClose();
    };
    window.history.pushState({ productModal: true }, '');
    window.addEventListener('popstate', onPopState);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('popstate', onPopState);
      if (!closedViaBackRef.current) window.history.back();
      closedViaBackRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const onImageMouseDown = (event: React.MouseEvent) => {
    if (imageView.zoom <= 1) return;
    event.preventDefault();
    setIsPanningImage(true);
    panStartRef.current = { x: event.clientX, y: event.clientY, panX: imageView.pan.x, panY: imageView.pan.y };
  };
  const onImageMouseMove = (event: React.MouseEvent) => {
    if (!isPanningImage) return;
    const start = panStartRef.current;
    setImageView((view) => ({ ...view, pan: clampPan({ x: start.panX + (event.clientX - start.x), y: start.panY + (event.clientY - start.y) }, view.zoom) }));
  };
  const stopPanningImage = () => setIsPanningImage(false);
  const resetImageZoom = () => setImageView({ zoom: 1, pan: { x: 0, y: 0 } });

  const video = getProductVideoEmbed(product.videoProvider, product.videoUrl);
  const variantGroup = groups.length === 0 ? getVariantGroup(product.id) : undefined;

  return <div className="productModalBackdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="productModal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="productModalClose" aria-label="Cerrar detalles del producto" onClick={onClose}>×</button>
      {product.image ? <div
        ref={productImageRef}
        className="productModalImage"
        onMouseDown={onImageMouseDown}
        onMouseMove={onImageMouseMove}
        onMouseUp={stopPanningImage}
        onMouseLeave={stopPanningImage}
        onDoubleClick={resetImageZoom}
        style={{ cursor: imageView.zoom > 1 ? (isPanningImage ? 'grabbing' : 'grab') : 'zoom-in' }}
      ><Image
        src={product.image}
        alt={product.name}
        fill
        sizes="(max-width: 760px) 100vw, 760px"
        priority
        draggable={false}
        onContextMenu={imagesLocked ? (event) => event.preventDefault() : undefined}
        style={{ transform: `translate(${imageView.pan.x}px, ${imageView.pan.y}px) scale(${imageView.zoom})`, transition: isPanningImage ? 'none' : 'transform .15s ease-out', ...(imagesLocked ? IMAGE_LOCK_STYLE : {}) }}
      /></div> : <div className="productModalImage productModalImageEmpty">Sin imagen disponible</div>}
      <div className="productModalBody">
        <div className="menuTop"><h2 id="product-modal-title">{product.name}</h2>{!isInternalCategory(product.category) && <span className="tag">{product.category}</span>}</div>
        <p className="productModalDescription">{product.description}</p>
        {product.availability && <span className="small">{product.availability}</span>}
        <div className="productModalPrice">{product.price ? `$${product.price}` : 'Consultar'}</div>

        {video && <div className="productVideoSection">
          <div className="productVideoHeader"><strong>Video del producto</strong><span>{product.videoProvider === 'google-drive' ? 'Google Drive' : product.videoProvider === 'vimeo' ? 'Vimeo' : product.videoProvider === 'youtube' ? 'YouTube' : 'Video'}</span></div>
          <div className="productVideoFrame">
            {video.kind === 'iframe'
              ? <iframe src={video.src} title={`Video de ${product.name}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              : <video src={video.src} controls playsInline preload="metadata" controlsList={product.videoDownloadable === false ? 'nodownload' : undefined} onContextMenu={product.videoDownloadable === false ? (event) => event.preventDefault() : undefined} />}
          </div>
        </div>}

        {groups.length > 0 ? <ProductConfigurator
          product={product}
          groups={groups}
          options={options}
          initial={editingConfiguredLine ? { configuration: editingConfiguredLine.configuration, qty: editingConfiguredLine.qty } : undefined}
          onAdd={onAddConfigured}
        /> : variantGroup ? <VariantPicker
          product={product}
          group={variantGroup}
          initial={editingVariantLine ? { variantId: editingVariantLine.variantId, qty: editingVariantLine.qty } : undefined}
          onAdd={onAddVariant}
        /> : <>
          <div className="productModalActions"><button aria-label={`Quitar ${product.name}`} onClick={() => onQuantityChange(-1)}>−</button><span>{quantity}</span><button aria-label={`Agregar ${product.name}`} onClick={() => onQuantityChange(1)}>+</button></div>
          <button className="btn primary productModalAdd" onClick={onAddSimple}>Agregar al carrito</button>
        </>}
      </div>
    </section>
  </div>;
}
