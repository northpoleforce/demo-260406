export interface Dish {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  createdAt: string;
}

const mockImages = [
  '/images/michelin_dish_1775385959985.png',
  '/images/premium_dessert_1775385984175.png',
  '/images/luxurious_wagyu_1775386008619.png'
];

const mockDishNames = [
  '喵星人最爱鱼饼',
  '汪汪快乐骨头汤',
  '招财猫黄金脆皮鸡',
  '毛茸茸彩虹纸杯蛋糕',
  '胖橘特调芝士牛奶'
];

const mockDescriptions = [
  '喵了个咪～刚出炉的鱼饼，香气扑鼻，隔壁的小猫咪都馋哭了！',
  '大骨头熬制7749小时！喝一口，快乐得摇尾巴～',
  '金黄酥脆，咬一口咔滋咔滋响！吃了招财又进宝！',
  '五彩斑斓的软糯云朵口感，可爱度直接拉满 1000%！',
  '胖橘老板亲自调配，奶香浓郁，喝完肚皮圆滚滚！'
];

let idCounter = 1;

function generateDish(): Dish {
  const nameIndex = Math.floor(Math.random() * mockDishNames.length);
  const descIndex = Math.floor(Math.random() * mockDescriptions.length);
  const imageIndex = Math.floor(Math.random() * mockImages.length);

  return {
    id: `dish-${idCounter++}-${Date.now()}`,
    name: mockDishNames[nameIndex],
    description: mockDescriptions[descIndex],
    imageUrl: mockImages[imageIndex],
    createdAt: new Date().toISOString(),
  };
}

type RealtimeCallback = (payload: { new: Dish }) => void;

class SupabaseMockChannel {
  private callbacks: RealtimeCallback[] = [];
  private intervalId: NodeJS.Timeout | null = null;

  on(
    event: string,
    filter: Record<string, string>,
    callback: RealtimeCallback
  ) {
    if (event === 'postgres_changes' && filter.event === 'INSERT') {
      this.callbacks.push(callback);
    }
    return this;
  }

  subscribe(statusCallback?: (status: string) => void) {
    if (statusCallback) {
      statusCallback('SUBSCRIBED');
    }
    
    // Simulate initial data (optional, but real realtime just listens. We will provide a fetch method for initial)
    // Here we start a mock interval that acts as the backend adding new records.
    this.intervalId = setInterval(() => {
      const newDish = generateDish();
      this.callbacks.forEach(cb => cb({ new: newDish }));
    }, 15000); // Emits a new dish every 15 seconds

    return this;
  }

  unsubscribe() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

export const supabase = {
  channel: (name: string) => new SupabaseMockChannel(),
  // Mock function to fetch the initial data instead of a blank screen
  from: (table: string) => ({
    select: () => ({
      order: (column: string, { ascending }: { ascending: boolean }) => ({
        limit: (count: number) => {
          return new Promise<{ data: Dish[], error: null }>((resolve) => {
            const initialData = Array.from({ length: 3 }).map(() => generateDish()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setTimeout(() => {
              resolve({ data: initialData, error: null });
            }, 600);
          });
        }
      })
    })
  })
};
