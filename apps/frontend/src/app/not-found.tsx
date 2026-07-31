import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-900">
      <h1 className="text-6xl font-bold mb-4 text-blue-600">404</h1>
      <h2 className="text-2xl font-semibold mb-6">Página no encontrada</h2>
      <p className="text-gray-600 mb-8 max-w-md text-center">
        Lo sentimos, la página que estás buscando no existe, ha sido eliminada o temporalmente no está disponible.
      </p>
      <Link 
        href="/login" 
        className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
