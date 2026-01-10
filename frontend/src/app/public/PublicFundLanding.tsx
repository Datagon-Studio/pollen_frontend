import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";

export default function PublicFundLanding() {
  const [fundId, setFundId] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fundId.trim()) {
      setError("Please enter a fund ID");
      return;
    }

    // Navigate to the public fund page
    navigate(`/g/${fundId.trim()}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-amber to-gold flex items-center justify-center shadow-md">
              <span className="text-2xl font-bold text-white">PH</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Find a Fund</CardTitle>
          <CardDescription className="text-center">
            Enter the fund ID to view the public page
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fundId">Fund ID</Label>
              <Input
                id="fundId"
                type="text"
                placeholder="a8963668-f203-4133-85aa-059f32c35279"
                value={fundId}
                onChange={(e) => {
                  setFundId(e.target.value);
                  setError("");
                }}
                className="font-mono text-sm"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Enter the fund ID provided by the group administrator
              </p>
            </div>
            <Button type="submit" className="w-full">
              <Search className="h-4 w-4 mr-2" />
              View Fund
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
