import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  const navLinks = [
    { label: "Home", href: "#home" },
    { label: "Projects", href: "#projects" },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 h-20 flex items-center justify-center bg-(--bg-color)/90 backdrop-blur-md">
      <div className="w-[90%] max-w-[1200px] flex justify-between items-center">
        <Link
          href="/"
          className="flex items-center gap-3 font-serif font-bold text-2xl tracking-tight hover:opacity-80 transition-opacity"
        >
          <Image
            src="/myavatar.png"
            alt="Prajwol avatar"
            width={40}
            height={40}
            className="rounded-full border border-(--accent-color)/40 shadow-sm"
            priority
            />
            {/* <span>Prajwol</span> */}
        </Link>
        <ul className="hidden md:flex gap-10 list-none">
          {navLinks.map(({ label, href }) => (
            <li key={label}>
              <Link
                href={href}
                className="text-(--text-secondary) font-medium text-base hover:text-(--accent-color) hover:-translate-y-0.5 transition-all inline-block"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
        {/* Mobile Menu Icon could go here */}
      </div>
    </nav>
  );
}
