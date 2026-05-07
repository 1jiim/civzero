export function Footer() {
  return (
    <footer className="border-t border-line mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-3 gap-4 text-muted text-sm">
        <div className="flex flex-col gap-1">
          <span className="font-heading text-primary">CIVZERO</span>
          <span>The last city.</span>
        </div>
        <div className="flex flex-col gap-2 items-center">
          <a href="#" className="hover:text-primary transition-colors">Terms</a>
          <a href="#" className="hover:text-primary transition-colors">Privacy</a>
        </div>
        <div className="flex justify-end">
          <span>Civ0 | v1.0</span>
        </div>
      </div>
    </footer>
  )
}
