import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuditFiltersProps {
  actionFilter: string;
  setActionFilter: (value: string) => void;
  userSearch: string;
  setUserSearch: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  onPageReset: () => void;
}

export function AuditFilters({
  actionFilter,
  setActionFilter,
  userSearch,
  setUserSearch,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onPageReset,
}: AuditFiltersProps) {
  const hasFilters = actionFilter || userSearch || startDate || endDate;

  const handleActionChange = (value: string) => {
    setActionFilter(value);
    onPageReset();
  };

  const handleUserSearchChange = (value: string) => {
    setUserSearch(value);
    onPageReset();
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    onPageReset();
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    onPageReset();
  };

  const clearFilters = () => {
    setActionFilter("");
    setUserSearch("");
    setStartDate("");
    setEndDate("");
    onPageReset();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Action Type</label>
          <Select value={actionFilter} onValueChange={handleActionChange}>
            <SelectTrigger>
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All actions</SelectItem>
              <SelectItem value="TIER_CREATE">Tier Created</SelectItem>
              <SelectItem value="TIER_UPDATE">Tier Updated</SelectItem>
              <SelectItem value="TIER_DELETE">Tier Deleted</SelectItem>
              <SelectItem value="SUBSCRIPTION_CREATE">
                Subscription Created
              </SelectItem>
              <SelectItem value="SUBSCRIPTION_UPDATE">
                Subscription Updated
              </SelectItem>
              <SelectItem value="SUBSCRIPTION_DELETE">
                Subscription Deleted
              </SelectItem>
              <SelectItem value="TIER_CHANGE">Tier Changed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">User ID</label>
          <Input
            type="text"
            placeholder="Search by user ID"
            value={userSearch}
            onChange={(e) => handleUserSearchChange(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Start Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">End Date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
          />
        </div>
      </div>

      {hasFilters && (
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
