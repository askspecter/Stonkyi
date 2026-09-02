const SAMPLE_IDS = [1, 2, 3, 7, 12, 23, 42, 88, 168, 420, 555, 777, 888, 900, 999, 314];

export function BrokerGallery() {
  return (
    <section id="gallery" className="mt-16">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
          Meet the <span className="acid-text">brokers</span>
        </h2>
        <span className="text-[11px] uppercase tracking-widest text-acidDim">
          999 unique · each a wallet
        </span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {SAMPLE_IDS.map((id) => (
          <div key={id} className="panel overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/nft/images/${id}.png`}
              alt={`StonkInu Broker #${id}`}
              className="aspect-square w-full bg-ink [image-rendering:pixelated]"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
