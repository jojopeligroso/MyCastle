import { requireAuth } from '@/lib/auth/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NaturalLanguageQuery } from '@/components/admin/query/NaturalLanguageQuery';
import { SimpleQueryBuilder } from '@/components/admin/query/SimpleQueryBuilder';

export default async function QueryPage() {
  await requireAuth(['admin']);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Query Interface</h1>
        <p className="mt-2 text-gray-600">
          Access your data using natural language or a simple query builder. No SQL knowledge required.
        </p>
      </div>

      <Tabs defaultValue="natural" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="natural">🗣️ Natural Language</TabsTrigger>
          <TabsTrigger value="builder">🔧 Query Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="natural" className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">💡 How it works</h3>
            <p className="text-sm text-blue-800">
              Describe what you want to see in plain English. Our AI will translate it to SQL, show you a preview,
              and execute it safely. Perfect for quick queries and exploration.
            </p>
            <div className="mt-3 text-sm text-blue-700">
              <strong>Examples:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Show me all active students</li>
                <li>List students whose visas expire in the next 30 days</li>
                <li>Find students in Pre-Intermediate level</li>
                <li>Show me all enrollments that start this month</li>
              </ul>
            </div>
          </div>

          <NaturalLanguageQuery />
        </TabsContent>

        <TabsContent value="builder" className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-900 mb-2">💡 How it works</h3>
            <p className="text-sm text-green-800">
              Build your query step by step using visual controls. Select a table, choose columns, add filters,
              and see results instantly. The generated SQL is shown for transparency.
            </p>
            <div className="mt-3 text-sm text-green-700">
              <strong>Steps:</strong>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Select a table (users, classes, enrollments, etc.)</li>
                <li>Choose which columns to display (or leave empty for all)</li>
                <li>Add filters to narrow down results (optional)</li>
                <li>Set a result limit and run the query</li>
              </ol>
            </div>
          </div>

          <SimpleQueryBuilder />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="mt-12 border-t pt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Common Queries</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickActionCard
            title="All Students"
            description="View complete student roster"
            query="Show me all students"
          />
          <QuickActionCard
            title="Visa Expiring"
            description="Students with visas expiring soon"
            query="Show students whose visas expire in the next 30 days"
          />
          <QuickActionCard
            title="Active Enrollments"
            description="Current enrollments across all classes"
            query="Show all active enrollments"
          />
          <QuickActionCard
            title="Students by Level"
            description="Filter students by CEFR level"
            query="Show students in B1 level"
          />
          <QuickActionCard
            title="Class Roster"
            description="View students in a specific class"
            query="Show all students in Pre-Intermediate class"
          />
          <QuickActionCard
            title="Recent Enrollments"
            description="Students who joined this month"
            query="Show enrollments from this month"
          />
        </div>
      </div>

      {/* Safety Notice */}
      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <span className="text-amber-600 text-xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-amber-900">Safety & Security</h3>
            <p className="text-sm text-amber-800 mt-1">
              This interface only allows <strong>SELECT</strong> queries (read-only). All queries are subject to
              Row Level Security (RLS) policies, ensuring you only access data you're authorized to see.
              Queries have a 5-second timeout and are limited to 1,000 rows maximum.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ title, description, query }: { title: string; description: string; query: string }) {
  return (
    <div className="border rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer bg-white">
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
        &quot;{query}&quot;
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Admin Query Interface | MyCastle',
  description: 'Query your data using natural language or a visual query builder',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;
