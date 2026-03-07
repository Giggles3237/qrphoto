import React from "react";
import { Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OAuthConsentPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-2xl shadow-lg border-muted/50">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Camera className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-serif">Authorization Consent</CardTitle>
          <CardDescription className="text-lg">
            QRPhoto App Access Request
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <h3 className="text-lg font-semibold">What we access:</h3>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>
                <strong>Basic Profile Information:</strong> We use your Google name and email address to create your admin account.
              </li>
              <li>
                <strong>Identity Verification:</strong> We use Google to verify you are the authorized owner of this project.
              </li>
            </ul>

            <h3 className="text-lg font-semibold pt-4">Data Usage:</h3>
            <p className="text-muted-foreground">
              We do not share your personal data with third parties. Your email is only used to identify you within this specific project's administrative dashboard.
            </p>

            <h3 className="text-lg font-semibold pt-4">Your Rights:</h3>
            <p className="text-muted-foreground">
              You can revoke this access at any time through your Google Account settings. By continuing, you agree to allow QRPhoto to use your profile information as described.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-muted">
            <Link href="/login" className="flex-1">
              <Button className="w-full rounded-full py-6 text-lg font-medium" style={{ backgroundColor: "var(--primary)" }}>
                I Agree
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full rounded-full py-6 text-lg font-medium">
                Cancel
              </Button>
            </Link>
          </div>
          
          <p className="text-center text-[10px] text-muted-foreground italic">
            This page serves as the required OAuth consent and privacy disclosure for Google Cloud verification.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
