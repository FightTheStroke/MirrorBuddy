'use client';

/**
 * StripeProductsTab — Products table with CRUD
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { csrfFetch } from '@/lib/auth';
import type { StripeProduct } from '@/lib/admin/stripe-admin-types';
import { formatCurrency } from '@/lib/admin/stripe-admin-service';
import { StripePriceDialog } from './stripe-price-dialog';

interface StripeProductsTabProps {
  initialProducts: StripeProduct[];
}

export function StripeProductsTab({ initialProducts }: StripeProductsTabProps) {
  const t = useTranslations('admin');
  const [products, setProducts] = useState(initialProducts);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const refreshProducts = async () => {
    const res = await fetch('/api/admin/stripe/products');
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await csrfFetch('/api/admin/stripe/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        setShowCreate(false);
        setName('');
        setDescription('');
        await refreshProducts();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async (productId: string) => {
    const res = await csrfFetch(`/api/admin/stripe/products/${productId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      await refreshProducts();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('stripe.products') ?? 'Products'}</CardTitle>
        <Button onClick={() => setShowCreate(true)}>
          {t('stripe.createProduct') ?? 'Create Product'}
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('stripe.name') ?? 'Name'}</TableHead>
              <TableHead>{t('stripe.status') ?? 'Status'}</TableHead>
              <TableHead>{t('stripe.price') ?? 'Price'}</TableHead>
              <TableHead>{t('stripe.actions') ?? 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  <Badge variant={product.active ? 'default' : 'secondary'}>
                    {product.active ? 'Active' : 'Archived'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {product.prices[0]
                    ? formatCurrency(product.prices[0].unitAmount, product.prices[0].currency)
                    : '—'}
                </TableCell>
                <TableCell className="space-x-2">
                  <StripePriceDialog productId={product.id} onCreated={refreshProducts} />
                  {product.active && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleArchive(product.id)}
                    >
                      {t('stripe.archive') ?? 'Archive'}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {t('stripe.noProducts') ?? 'No products found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Create Product Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('stripe.createProduct') ?? 'Create Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="product-name" className="text-sm font-medium">
                {t('stripe.name') ?? 'Name'}
              </label>
              <input
                id="product-name"
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="product-desc" className="text-sm font-medium">
                {t('stripe.description') ?? 'Description'}
              </label>
              <input
                id="product-desc"
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button onClick={handleCreate} disabled={creating || !name}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
