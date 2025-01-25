import React, { useState, useCallback, useMemo } from 'react';
import { SearchIcon, PlusCircle, ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast-context';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, calculatePriceChange } from '@/lib/utils';
import * as Yup from 'yup';


const Header = React.memo(() => (
  <header className="flex items-center justify-between p-4 border-b">
    <a href="/" className="text-2xl font-bold text-primary">PriceTrack</a>
    <Button variant="outline" className="flex items-center gap-2">
      <PlusCircle className="w-4 h-4" />
      Track New
    </Button>
  </header>
));

const handleProductClick = (id) => {
  // Navigate to product detail page or show modal
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
            <p className="text-sm text-gray-500">{product.platform}</p>
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
              {formatCurrency(Math.abs(priceChange))} ({priceChangePercent}%)
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

const TrackNewForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    url: '',
    platform: ''
  });

  const validationSchema = Yup.object().shape({
    url: Yup.string().url('Invalid URL').required('URL is required'),
    platform: Yup.string().required('Platform is required')
  });

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      await validationSchema.validate(formData, { abortEarly: false });
      // Add API call here
      toast({
        title: "Success",
        description: "Product tracking started successfully",
      });
      setFormData({ url: '', platform: '' });
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
  }, [formData, toast, validationSchema]);

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Track New Product</h1>
      <div className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium mb-1">Product URL:</label>
          <Input
            id="url"
            type="url"
            value={formData.url}
            onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
            placeholder="Enter product URL"
          />
        </div>
        <div>
          <label htmlFor="platform" className="block text-sm font-medium mb-1">Platform:</label>
          <Select
            value={formData.platform}
            onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}
          >
            <SelectTrigger id="platform">
              <SelectValue placeholder="Select a platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tokopedia">Tokopedia</SelectItem>
              <SelectItem value="shopee">Shopee</SelectItem>
              <SelectItem value="bukalapak">Bukalapak</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="w-full">Start Tracking</Button>
      </div>
    </form>
  );
};

const App = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([
    {
      id: 1,
      name: 'Smartphone X',
      platform: 'Tokopedia',
      currentPrice: 3500000,
      priceChange: -200000,
      priceChangePercent: 5.4,
      priceHistory: [
        { date: '2023-04-01', price: 3700000 },
        { date: '2023-04-15', price: 3650000 },
        { date: '2023-05-01', price: 3600000 },
        { date: '2023-05-15', price: 3550000 },
        { date: '2023-06-01', price: 3500000 }
      ]
    },
    {
      id: 2,
      name: 'Laptop Y',
      platform: 'Shopee',
      currentPrice: 7640000,
      priceChange: -350000,
      priceChangePercent: 2.4,
      priceHistory: [
        { date: '2023-03-01', price: 7990000 },
        { date: '2023-03-15', price: 7890000 },
        { date: '2023-04-01', price: 7790000 },
        { date: '2023-04-15', price: 7690000 },
        { date: '2023-05-01', price: 7640000 }
      ]
    },
    {
      id: 3,
      name: 'Sendal Jepit',
      platform: 'Bukalapak',
      currentPrice: 30000,
      priceChange: 1000,
      priceChangePercent: 0.1,
      priceHistory: [
        { date: '2023-02-01', price: 29000 },
        { date: '2023-02-15', price: 29500 },
        { date: '2023-03-01', price: 29750 },
        { date: '2023-03-15', price: 30000 },
        { date: '2023-04-01', price: 30000 }
      ]
    }
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
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
    </div>
  );
};

export default App;