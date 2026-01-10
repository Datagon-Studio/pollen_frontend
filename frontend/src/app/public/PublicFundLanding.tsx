import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";

export default function PublicFundLanding() {
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!groupId.trim()) {
      setError("Please enter a group ID");
      return;
    }

    // Navigate to the public group page
    navigate(`/g/${groupId.trim()}`);
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
          <CardTitle className="text-2xl text-center">Find a Group</CardTitle>
          <CardDescription className="text-center">
            Enter the group ID to view the public page
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
              <Label htmlFor="groupId">Group ID</Label>
              <Input
                id="groupId"
                type="text"
                placeholder="a8963668-f203-4133-85aa-059f32c35279"
                value={groupId}
                onChange={(e) => {
                  setGroupId(e.target.value);
                  setError("");
                }}
                className="font-mono text-sm"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Enter the group ID provided by the group administrator
              </p>
            </div>
            <Button type="submit" className="w-full">
              <Search className="h-4 w-4 mr-2" />
              View Group
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
