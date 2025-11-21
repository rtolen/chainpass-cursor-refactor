import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  discount_percentage: number | null;
  is_active: boolean;
  multi_use: boolean;
  max_uses: number | null;
  current_uses: number;
  description: string | null;
  created_at: string;
}

export function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    multi_use: false,
    max_uses: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCoupons((data || []) as Coupon[]);
    } catch (error: any) {
      toast({
        title: "Error loading coupons",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        multi_use: formData.multi_use,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        description: formData.description || null,
        is_active: formData.is_active,
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from("coupons")
          .update(couponData)
          .eq("id", editingCoupon.id);

        if (error) throw error;
        toast({ title: "Coupon updated successfully" });
      } else {
        const { error } = await supabase
          .from("coupons")
          .insert([couponData]);

        if (error) throw error;
        toast({ title: "Coupon created successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      loadCoupons();
    } catch (error: any) {
      toast({
        title: "Error saving coupon",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Coupon deleted successfully" });
      loadCoupons();
    } catch (error: any) {
      toast({
        title: "Error deleting coupon",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);

      if (error) throw error;
      toast({ title: `Coupon ${!coupon.is_active ? "activated" : "deactivated"}` });
      loadCoupons();
    } catch (error: any) {
      toast({
        title: "Error updating coupon",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      multi_use: coupon.multi_use,
      max_uses: coupon.max_uses?.toString() || "",
      description: coupon.description || "",
      is_active: coupon.is_active,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      code: "",
      discount_type: "percentage",
      discount_value: "",
      multi_use: false,
      max_uses: "",
      description: "",
      is_active: true,
    });
    setEditingCoupon(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Coupon Management
            </CardTitle>
            <CardDescription>Create and manage discount coupons</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingCoupon ? "Edit" : "Create"} Coupon</DialogTitle>
                  <DialogDescription>
                    {editingCoupon ? "Update" : "Create a new"} discount coupon
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Coupon Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="FC0002"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount_type">Discount Type</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(value: "percentage" | "fixed") =>
                        setFormData({ ...formData, discount_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount_value">
                      Discount Value {formData.discount_type === "percentage" ? "(%)" : "($)"}
                    </Label>
                    <Input
                      id="discount_value"
                      type="number"
                      step={formData.discount_type === "percentage" ? "1" : "0.01"}
                      min="0"
                      max={formData.discount_type === "percentage" ? "100" : undefined}
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Staff comp coupon"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="multi_use"
                      checked={formData.multi_use}
                      onCheckedChange={(checked) => setFormData({ ...formData, multi_use: checked })}
                    />
                    <Label htmlFor="multi_use">Multi-use (can be used multiple times)</Label>
                  </div>
                  {!formData.multi_use && (
                    <div className="space-y-2">
                      <Label htmlFor="max_uses">Max Uses (optional)</Label>
                      <Input
                        id="max_uses"
                        type="number"
                        min="1"
                        value={formData.max_uses}
                        onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                        placeholder="Unlimited"
                      />
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingCoupon ? "Update" : "Create"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading coupons...</p>
        ) : coupons.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No coupons created yet</p>
        ) : (
          <div className="space-y-4">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-bold">{coupon.code}</code>
                    <Badge variant={coupon.is_active ? "default" : "secondary"}>
                      {coupon.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {coupon.multi_use && <Badge variant="outline">Multi-use</Badge>}
                    {coupon.discount_percentage === 100 && (
                      <Badge className="bg-success text-success-foreground">100% OFF</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {coupon.discount_type === "percentage"
                      ? `${coupon.discount_percentage}% discount`
                      : `$${coupon.discount_value} off`}
                    {coupon.description && ` • ${coupon.description}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Used: {coupon.current_uses}
                    {coupon.max_uses && !coupon.multi_use ? ` / ${coupon.max_uses}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={coupon.is_active}
                    onCheckedChange={() => handleToggleActive(coupon)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(coupon)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(coupon.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
