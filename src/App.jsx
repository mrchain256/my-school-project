import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { SearchIcon, PlusCircle, ArrowDownIcon, ArrowUpIcon, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToastProvider , useToast } from '@/components/ui/toast-context';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, calculatePriceChange } from '@/lib/utils';
import * as Yup from 'yup';
import { Badge } from '@/components/ui/badge'; // For platform display

const Header = React.memo(({ onTrackNewClick }) => (
  <header className="flex items-center justify-between p-4 border-b">
    <a href="/" className="text-2xl font-bold text-primary">PriceTrack</a>
    <Button variant="outline" className="flex items-center gap-2" onClick={onTrackNewClick}>
      <PlusCircle className="w-4 h-4" />
      Track New
    </Button>
  </header>
));

const handleProductClick = (id) => {
  console.log(`Clicked product with ID: ${id}`);
};

const ProductCard = React.memo(({ product }) => {
  const { priceChange, priceChangePercent } = calculatePriceChange(
    product.currentPrice,
    product.priceHistory?.[product.priceHistory.length - 1]?.price
  );
  const isNegativeChange = priceChange < 0;

  return (
    <Card className="mb-4" onClick={() => handleProductClick(product.id)}>
      <CardContent className="p-4 cursor-pointer">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">{product.name}</h3>
            <Badge variant="outline" className="text-sm">
              {product.platform}
            </Badge>
            {product.url && (
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline block mt-2"
              >
                View Product
              </a>
            )}
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">
              {formatCurrency(product.currentPrice)}
            </div>
            <div className={`flex items-center gap-1 ${isNegativeChange ? 'text-red-500' : 'text-green-500'}`}>
              {isNegativeChange ? (
                <ArrowDownIcon className="w-4 h-4" />
              ) : (
                <ArrowUpIcon className="w-4 h-4" />
              )}
              {formatCurrency(Math.abs(priceChange))} (
              {typeof priceChangePercent === 'number' ? priceChangePercent.toFixed(2) : '0.00'}%)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const ProductList = ({ searchQuery, products }) => {
  const [sortType, setSortType] = useState('name');

  const filteredProducts = useMemo(() => {
    return products.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortType === 'name') {
        return a.name.localeCompare(b.name);
      }
      return sortType === 'price' ? a.currentPrice - b.currentPrice : 0;
    });
  }, [filteredProducts, sortType]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Button 
          variant="outline" 
          onClick={() => setSortType('name')}
          className={sortType === 'name' ? 'bg-primary/10' : ''}
        >
          Sort by Name
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setSortType('price')}
          className={sortType === 'price' ? 'bg-primary/10' : ''}
        >
          Sort by Price
        </Button>
      </div>
      <div className="space-y-4">
        {sortedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

const TrackNewForm = ({ onClose }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    product_name: '',
  });

  const validationSchema = Yup.object().shape({
    product_name: Yup.string().required('Product name is required'),
  });

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      await validationSchema.validate(formData, { abortEarly: false });
      
      const response = await fetch('http://localhost:8000/track-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          product_name: formData.product_name,
        }),
      });

      if (!response.ok) throw new Error('Failed to track product');
      
      toast({
        title: "Success",
        description: "Product tracking started successfully",
      });
      setFormData({ product_name: '' });
      onClose(); // Close the modal after successful submission

      // Refresh products list
      const productsResponse = await fetch('http://localhost:8000/products');
      const updatedProducts = await productsResponse.json();
      setProducts(updatedProducts);

    } catch (error) {
      if (error instanceof Yup.ValidationError) {
        error.inner.forEach(err => {
          toast({
            title: err.path,
            description: err.message,
            variant: "destructive"
          });
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to start tracking product",
          variant: "destructive",
        });
      }
    }
  }, [formData, toast, validationSchema, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Track New Product</h1>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="product_name" className="block text-sm font-medium mb-1">
              Product Name:
            </label>
            <Input
              id="product_name"
              value={formData.product_name}
              onChange={(e) => setFormData({ product_name: e.target.value })}
              placeholder="Enter product name"
            />
          </div>
          <Button type="submit" className="w-full">Start Tracking</Button>
        </form>
      </div>
    </div>
  );
};

const App = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [isTrackNewFormOpen, setIsTrackNewFormOpen] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      const response = await fetch('http://localhost:8000/products');
      const data = await response.json();
      setProducts(data);
    };
    fetchProducts();
  }, []);

  return (
    <ToastProvider>
    <div className="min-h-screen bg-gray-50">
      <Header onTrackNewClick={() => setIsTrackNewFormOpen(true)} />
      <main className="container mx-auto p-4">
        <div className="mb-4">
          <div className="relative">
            <Input 
              type="search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..." 
              className="pl-10"
            />
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        
        <Tabs defaultValue="my-products">
          <TabsList>
            <TabsTrigger value="my-products">My Products</TabsTrigger>
            <TabsTrigger value="price-alerts">Price Alerts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-products">
            <ProductList searchQuery={searchQuery} products={products} />
          </TabsContent>
          
          <TabsContent value="price-alerts">
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                You have no active price alerts.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-8">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Price History Chart</h2>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={products.flatMap(p => p.priceHistory)}>
                  <XAxis dataKey="date" />
                  <YAxis unit="IDR" domain={['dataMin', 'dataMax']} />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="price" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-gray-500">
        © {new Date().getFullYear()} PriceTrack App
      </footer>

      {isTrackNewFormOpen && (
        <TrackNewForm onClose={() => setIsTrackNewFormOpen(false)} />
      )}
    </div>
    </ToastProvider>
  );
};

export default App;