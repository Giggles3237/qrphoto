"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Send, User, Mic, Video, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MediaRecorder } from "./media-recorder";
import type { GuestBookEntry } from "@/types";

interface GuestBookClientProps {
  eventId: string;
  initialEntries: GuestBookEntry[];
  primaryColor: string;
}

export function GuestBookClient({
  eventId,
  initialEntries,
  primaryColor,
}: GuestBookClientProps) {
  const [entries, setEntries] = useState<GuestBookEntry[]>(initialEntries);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"audio" | "video" | null>(null);
  const [recordingMode, setRecordingMode] = useState<"audio" | "video" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (!message.trim() && !mediaUrl) {
      toast.error("Please enter a message or record one.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/guest-book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          message: message.trim() || null, 
          media_url: mediaUrl, 
          media_type: mediaType 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to post message");
      }

      setEntries([data, ...entries]);
      setName("");
      setMessage("");
      setMediaUrl(null);
      setMediaType(null);
      toast.success("Message posted to guest book!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post message");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleMediaComplete = (url: string) => {
    setMediaUrl(url);
    setMediaType(recordingMode);
    setRecordingMode(null);
  };

  return (
    <div className="space-y-12 max-w-2xl mx-auto">
      {/* Post form */}
      <Card className="shadow-sm border-muted/50 bg-white/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-serif">
            <MessageSquare className="h-5 w-5" style={{ color: primaryColor }} />
            Leave a Message
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="guest-name" className="text-sm font-medium">Your Name</label>
              <Input
                id="guest-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                className="rounded-full px-4"
              />
            </div>

            {recordingMode ? (
              <MediaRecorder
                type={recordingMode}
                primaryColor={primaryColor}
                onComplete={handleMediaComplete}
                onCancel={() => setRecordingMode(null)}
              />
            ) : mediaUrl ? (
              <div className="p-4 border rounded-2xl bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    {mediaType === "video" ? <Video className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    {mediaType?.charAt(0).toUpperCase()}{mediaType?.slice(1)} message attached
                  </span>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setMediaUrl(null); setMediaType(null); }}
                    className="h-8 w-8 p-0 rounded-full text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {mediaType === "video" ? (
                  <video src={mediaUrl} controls className="w-full rounded-xl aspect-video bg-black" />
                ) : (
                  <audio src={mediaUrl} controls className="w-full" />
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="guest-message" className="text-sm font-medium">Your Message (optional if recording)</label>
                  <Textarea
                    id="guest-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Congratulations on your wedding! We are so happy for you..."
                    rows={3}
                    className="rounded-2xl px-4 py-3"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setRecordingMode("audio")}
                    className="flex-1 rounded-full border-dashed"
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Record Voice
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setRecordingMode("video")}
                    className="flex-1 rounded-full border-dashed"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Record Video
                  </Button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || !!recordingMode}
              className="w-full rounded-full py-6 text-lg font-medium shadow-md hover:shadow-lg transition-all mt-4"
              style={{ backgroundColor: primaryColor }}
            >
              <Send className="h-5 w-5 mr-2" />
              {isSubmitting ? "Posting..." : "Post to Guest Book"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Entries list */}
      <div className="space-y-6 pb-20">
        <h2 className="text-2xl font-serif tracking-tight text-center">Guest Book Messages</h2>
        
        {entries.length === 0 ? (
          <p className="text-center text-muted-foreground italic py-12">
            No messages yet. Be the first to leave a wish!
          </p>
        ) : (
          <div className="grid gap-6">
            {entries.map((entry) => (
              <Card key={entry.id} className="border-none shadow-sm bg-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-3 flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{entry.name}</h3>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {entry.message && (
                        <p className="text-muted-foreground leading-relaxed italic">
                          &quot;{entry.message}&quot;
                        </p>
                      )}

                      {entry.media_url && (
                        <div className="pt-2">
                          {entry.media_type === "video" ? (
                            <video 
                              src={entry.media_url} 
                              controls 
                              className="w-full rounded-xl aspect-video bg-black shadow-inner"
                            />
                          ) : (
                            <div className="bg-muted/30 p-3 rounded-2xl border border-muted/50">
                              <audio src={entry.media_url} controls className="w-full" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
