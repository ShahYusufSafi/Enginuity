import Navbar from "../components/NavBar2";

export default function MainLayout({children}: {children: React.ReactNode}) {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <main className="flex-grow overflow-auto">
        {children}
      </main>
    </div>
  );
}