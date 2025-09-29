// app/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, RefreshCw, Sparkles } from 'lucide-react';
import Link from 'next/link';

const DEFAULT_ENDPOINT = 'https://api.hicap.ai/v2/openai/dev';

export default function SettingsPage() {
  const [endpointUrl, setEndpointUrl] = useState<string>(DEFAULT_ENDPOINT);
  const [savedUrl, setSavedUrl] = useState<string>(DEFAULT_ENDPOINT);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Load saved endpoint from localStorage
    const saved = localStorage.getItem('api_endpoint_url');
    if (saved) {
      setEndpointUrl(saved);
      setSavedUrl(saved);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('api_endpoint_url', endpointUrl);
    setSavedUrl(endpointUrl);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleReset = () => {
    setEndpointUrl(DEFAULT_ENDPOINT);
    localStorage.setItem('api_endpoint_url', DEFAULT_ENDPOINT);
    setSavedUrl(DEFAULT_ENDPOINT);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const isModified = endpointUrl !== savedUrl;
  const isUsingDefault = savedUrl === DEFAULT_ENDPOINT;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Settings</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure your OpenAI-compatible API endpoint
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="endpoint-url">Endpoint URL</Label>
                <Input
                  id="endpoint-url"
                  type="url"
                  placeholder="https://api.example.com/v1"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the base URL for your OpenAI-compatible API endpoint
                </p>
              </div>

              <div className="space-y-2">
                <Label>Currently Active</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono">
                    {savedUrl}
                  </code>
                  {isUsingDefault ? (
                    <Badge variant="secondary">Default</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-primary text-primary-foreground">Custom</Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  disabled={!isModified}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaved ? 'Saved!' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isUsingDefault}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset to Default
                </Button>
              </div>

              {isModified && (
                <div className="rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-3">
                  <p className="text-sm text-yellow-900 dark:text-yellow-100">
                    You have unsaved changes. Click "Save Changes" to apply them.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default Endpoint</CardTitle>
              <CardDescription>
                The default endpoint used when no custom endpoint is configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              <code className="block rounded bg-muted px-3 py-2 text-xs font-mono">
                {DEFAULT_ENDPOINT}
              </code>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
              <CardDescription>
                Required for API authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded">PROVIDER_API_KEY</code>
                  <span className="text-xs text-muted-foreground">
                    Set this in your environment or .env.local file
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
