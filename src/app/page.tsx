import Link from "next/link";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Camera className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl font-bold">QRPhoto</h1>
        <p className="text-lg text-muted-foreground">
          Event photo sharing made simple. Guests scan a QR code, upload photos
          — no app or login required.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/admin/dashboard">
            <Button>Admin Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
