"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const fontPairs = [
  { heading: "Playfair Display", body: "Source Sans Pro", category: "Elegant Serif" },
  { heading: "Montserrat", body: "Open Sans", category: "Modern Sans" },
  { heading: "Roboto Slab", body: "Roboto", category: "Professional" },
  { heading: "Oswald", body: "Lato", category: "Bold & Clean" },
  { heading: "Merriweather", body: "Lato", category: "Classic Readable" },
  { heading: "Raleway", body: "Open Sans", category: "Minimalist" },
  { heading: "Poppins", body: "Inter", category: "Contemporary" },
  { heading: "Lora", body: "Merriweather", category: "Timeless Serif" },
  { heading: "Bebas Neue", body: "Roboto", category: "Strong & Modern" },
  { heading: "Abril Fatface", body: "Lato", category: "Dramatic Display" },
];

export default function CSSTools() {
  const router = useRouter();
  const [gradientStart, setGradientStart] = useState("#ff6b6b");
  const [gradientEnd, setGradientEnd] = useState("#4ecdc4");
  const [gradientAngle, setGradientAngle] = useState(90);
  const [shadowX, setShadowX] = useState(0);
  const [shadowY, setShadowY] = useState(4);
  const [shadowBlur, setShadowBlur] = useState(6);
  const [shadowColor, setShadowColor] = useState("#00000040");
  const [boxColor, setBoxColor] = useState("#ffffff");
  const [copiedGradient, setCopiedGradient] = useState(false);
  const [copiedShadow, setCopiedShadow] = useState(false);
  const [copiedFont, setCopiedFont] = useState<number | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  const gradientCSS = `background: linear-gradient(${gradientAngle}deg, ${gradientStart}, ${gradientEnd});`;
  const shadowCSS = `box-shadow: ${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor};`;

  useEffect(() => {
    const fontFamilies = fontPairs.flatMap(pair => [pair.heading, pair.body]);
    const uniqueFonts = Array.from(new Set(fontFamilies));
    
    uniqueFonts.forEach(font => {
      const fontId = `font-${font.replace(/ /g, '-').toLowerCase()}`;
      
      if (!document.getElementById(fontId)) {
        const link = document.createElement('link');
        link.id = fontId;
        link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;700&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
    });
    
    setTimeout(() => setFontsLoaded(true), 500);
  }, []);

  const copyToClipboard = (text: string, type: "gradient" | "shadow") => {
    navigator.clipboard.writeText(text);
    if (type === "gradient") {
      setCopiedGradient(true);
      setTimeout(() => setCopiedGradient(false), 2000);
    } else {
      setCopiedShadow(true);
      setTimeout(() => setCopiedShadow(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Breadcrumb items={[{ label: "CSS Tools", href: "/css-tools" }]} />
        
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">CSS Tools</h1>
            <p className="text-muted-foreground">Generate gradients, shadows, and color palettes</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Tabs defaultValue="gradient" className="space-y-6">
          <TabsList data-testid="tabs-css-tools" className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="gradient" data-testid="tab-gradient">Gradient</TabsTrigger>
            <TabsTrigger value="shadow" data-testid="tab-shadow">Shadow</TabsTrigger>
            <TabsTrigger value="fonts" data-testid="tab-fonts">Fonts</TabsTrigger>
            <TabsTrigger value="colors" data-testid="tab-colors">Colors</TabsTrigger>
          </TabsList>

          <TabsContent value="gradient" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gradient Settings</CardTitle>
                  <CardDescription>Customize your linear gradient</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gradient-start">Start Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="gradient-start"
                        type="color"
                        value={gradientStart}
                        onChange={(e) => setGradientStart(e.target.value)}
                        className="w-16 h-10"
                        data-testid="input-gradient-start"
                      />
                      <Input
                        type="text"
                        value={gradientStart}
                        onChange={(e) => setGradientStart(e.target.value)}
                        data-testid="input-gradient-start-text"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gradient-end">End Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="gradient-end"
                        type="color"
                        value={gradientEnd}
                        onChange={(e) => setGradientEnd(e.target.value)}
                        className="w-16 h-10"
                        data-testid="input-gradient-end"
                      />
                      <Input
                        type="text"
                        value={gradientEnd}
                        onChange={(e) => setGradientEnd(e.target.value)}
                        data-testid="input-gradient-end-text"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Angle: {gradientAngle}°</Label>
                    <Slider
                      value={[gradientAngle]}
                      onValueChange={(v) => setGradientAngle(v[0])}
                      max={360}
                      step={1}
                      data-testid="slider-gradient-angle"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>CSS Code</Label>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                        <code data-testid="text-gradient-css">{gradientCSS}</code>
                      </pre>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(gradientCSS, "gradient")}
                        data-testid="button-copy-gradient"
                      >
                        {copiedGradient ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="w-full h-64 rounded-md"
                    style={{ background: `linear-gradient(${gradientAngle}deg, ${gradientStart}, ${gradientEnd})` }}
                    data-testid="preview-gradient"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="shadow" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Shadow Settings</CardTitle>
                  <CardDescription>Customize your box shadow</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Horizontal Offset: {shadowX}px</Label>
                    <Slider
                      value={[shadowX]}
                      onValueChange={(v) => setShadowX(v[0])}
                      min={-50}
                      max={50}
                      step={1}
                      data-testid="slider-shadow-x"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Vertical Offset: {shadowY}px</Label>
                    <Slider
                      value={[shadowY]}
                      onValueChange={(v) => setShadowY(v[0])}
                      min={-50}
                      max={50}
                      step={1}
                      data-testid="slider-shadow-y"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Blur Radius: {shadowBlur}px</Label>
                    <Slider
                      value={[shadowBlur]}
                      onValueChange={(v) => setShadowBlur(v[0])}
                      min={0}
                      max={50}
                      step={1}
                      data-testid="slider-shadow-blur"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shadow-color">Shadow Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="shadow-color"
                        type="color"
                        value={shadowColor.slice(0, 7)}
                        onChange={(e) => setShadowColor(e.target.value + shadowColor.slice(7))}
                        className="w-16 h-10"
                        data-testid="input-shadow-color"
                      />
                      <Input
                        type="text"
                        value={shadowColor}
                        onChange={(e) => setShadowColor(e.target.value)}
                        data-testid="input-shadow-color-text"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="box-color">Box Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="box-color"
                        type="color"
                        value={boxColor}
                        onChange={(e) => setBoxColor(e.target.value)}
                        className="w-16 h-10"
                        data-testid="input-box-color"
                      />
                      <Input
                        type="text"
                        value={boxColor}
                        onChange={(e) => setBoxColor(e.target.value)}
                        data-testid="input-box-color-text"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>CSS Code</Label>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                        <code data-testid="text-shadow-css">{shadowCSS}</code>
                      </pre>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(shadowCSS, "shadow")}
                        data-testid="button-copy-shadow"
                      >
                        {copiedShadow ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-12">
                  <div
                    className="w-48 h-48 rounded-md"
                    style={{ 
                      backgroundColor: boxColor,
                      boxShadow: `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowColor}` 
                    }}
                    data-testid="preview-shadow"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="fonts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Google Fonts Pairs</CardTitle>
                <CardDescription>Perfectly paired font combinations for your projects</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {fontPairs.map((pair, index) => {
                  const fontImportUrl = `https://fonts.googleapis.com/css2?family=${pair.heading.replace(/ /g, '+')}:wght@700&family=${pair.body.replace(/ /g, '+')}:wght@400&display=swap`;
                  const cssCode = `@import url('${fontImportUrl}');\n\nh1, h2, h3 {\n  font-family: '${pair.heading}', sans-serif;\n}\n\nbody, p {\n  font-family: '${pair.body}', sans-serif;\n}`;
                  
                  return (
                    <div key={index} className="border rounded-md p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h4 className="font-medium mb-1">{pair.heading} + {pair.body}</h4>
                          <p className="text-sm text-muted-foreground">{pair.category}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(cssCode);
                            setCopiedFont(index);
                            setTimeout(() => setCopiedFont(null), 2000);
                          }}
                          data-testid={`button-copy-font-${index}`}
                        >
                          {copiedFont === index ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                          Copy CSS
                        </Button>
                      </div>
                      
                      <div className="bg-muted p-6 rounded-md space-y-3">
                        <h2 
                          className="text-3xl sm:text-4xl font-bold transition-opacity duration-300" 
                          style={{ 
                            fontFamily: `'${pair.heading}', sans-serif`,
                            opacity: fontsLoaded ? 1 : 0.5
                          }}
                          data-testid={`preview-heading-${index}`}
                        >
                          {pair.heading}
                        </h2>
                        <p 
                          className="text-base leading-relaxed transition-opacity duration-300" 
                          style={{ 
                            fontFamily: `'${pair.body}', sans-serif`,
                            opacity: fontsLoaded ? 1 : 0.5
                          }}
                          data-testid={`preview-body-${index}`}
                        >
                          The quick brown fox jumps over the lazy dog. {pair.body} provides excellent readability for body text and pairs beautifully with {pair.heading} headings.
                        </p>
                      </div>

                      <div className="relative">
                        <pre className="bg-muted p-3 rounded-md text-xs sm:text-sm overflow-x-auto">
                          <code data-testid={`text-font-css-${index}`}>{cssCode}</code>
                        </pre>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="colors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Color Palettes</CardTitle>
                <CardDescription>Professional color combinations for your projects</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { name: "Ocean Blue", colors: ["#006994", "#0891b2", "#06b6d4", "#22d3ee", "#67e8f9"], desc: "Primary: Deep Blue, Secondary: Cyan" },
                  { name: "Sunset Warm", colors: ["#dc2626", "#f97316", "#fb923c", "#fbbf24", "#fde047"], desc: "Primary: Red, Secondary: Orange" },
                  { name: "Forest Green", colors: ["#14532d", "#15803d", "#16a34a", "#22c55e", "#4ade80"], desc: "Primary: Dark Green, Secondary: Light Green" },
                  { name: "Royal Purple", colors: ["#581c87", "#7c3aed", "#a855f7", "#c084fc", "#e9d5ff"], desc: "Primary: Deep Purple, Secondary: Lavender" },
                  { name: "Cherry Blossom", colors: ["#9f1239", "#e11d48", "#f43f5e", "#fb7185", "#fda4af"], desc: "Primary: Rose, Secondary: Pink" },
                  { name: "Midnight Navy", colors: ["#0c4a6e", "#075985", "#0369a1", "#0284c7", "#38bdf8"], desc: "Primary: Navy, Secondary: Sky Blue" },
                  { name: "Autumn Harvest", colors: ["#78350f", "#92400e", "#b45309", "#d97706", "#f59e0b"], desc: "Primary: Brown, Secondary: Amber" },
                  { name: "Emerald Garden", colors: ["#065f46", "#047857", "#059669", "#10b981", "#34d399"], desc: "Primary: Emerald, Secondary: Mint" },
                  { name: "Lavender Dreams", colors: ["#5b21b6", "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd"], desc: "Primary: Violet, Secondary: Purple" },
                  { name: "Coral Reef", colors: ["#be123c", "#e11d48", "#fb7185", "#fda4af", "#fecdd3"], desc: "Primary: Crimson, Secondary: Rose" },
                ].map((palette) => (
                  <div key={palette.name} className="space-y-3">
                    <div>
                      <h4 className="font-medium">{palette.name}</h4>
                      <p className="text-sm text-muted-foreground">{palette.desc}</p>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {palette.colors.map((color, idx) => (
                        <div
                          key={color}
                          className="relative group"
                        >
                          <div
                            className="h-16 sm:h-20 rounded-md cursor-pointer hover-elevate transition-all"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              navigator.clipboard.writeText(color);
                              console.log(`Copied ${color}`);
                            }}
                            data-testid={`color-${color}`}
                            title={color}
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs font-mono bg-black/75 text-white px-2 py-1 rounded">
                              {color}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
