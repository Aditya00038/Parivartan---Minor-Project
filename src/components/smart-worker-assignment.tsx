'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, MapPin, CheckCircle, Clock, Zap, Search } from 'lucide-react';
import { departmentConfig } from '@/lib/constants';
import type { User, Report } from '@/lib/types';

interface SmartWorkerAssignmentProps {
  report: Report;
  workers: User[];
  onAssign: (workerId: string, workerName: string) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

export function SmartWorkerAssignment({
  report,
  workers,
  onAssign,
  isLoading = false,
  disabled = false,
}: SmartWorkerAssignmentProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>(report.department || '');
  const [isAssigning, setIsAssigning] = useState(false);

  // Filter workers by department and search
  const filteredWorkers = useMemo(() => {
    return workers.filter(worker => {
      const deptMatch = !selectedDept || worker.department === selectedDept;
      const searchMatch =
        !searchTerm ||
        worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.designation?.toLowerCase().includes(searchTerm.toLowerCase());
      return deptMatch && searchMatch;
    });
  }, [workers, selectedDept, searchTerm]);

  // Get department roles based on selected department
  const departmentRoles = selectedDept ? departmentConfig[selectedDept]?.roles || [] : [];

  const handleAssignWorker = async (worker: User) => {
    setIsAssigning(true);
    try {
      await onAssign(worker.id, worker.name);
      setOpen(false);
      setSearchTerm('');
    } finally {
      setIsAssigning(false);
    }
  };

  const departmentInfo = selectedDept ? departmentConfig[selectedDept] : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          disabled={disabled || isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          <Zap className="mr-2 h-4 w-4" />
          Smart Assign Worker
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Worker to {report.category}
          </DialogTitle>
          <DialogDescription>
            Select a worker from the <strong>{report.department}</strong> department based on their availability and location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Department Info */}
          {departmentInfo && (
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{departmentInfo.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{selectedDept}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{departmentInfo.description}</p>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Available Roles:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {departmentRoles.map(role => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search and Filters */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Search Workers</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or role..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Workers List */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Available Workers ({filteredWorkers.length})
            </p>
            <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-3 bg-muted/30">
              {filteredWorkers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No workers found in {report.department || 'selected'} department
                  </p>
                </div>
              ) : (
                filteredWorkers.map(worker => (
                  <Card
                    key={worker.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm truncate">{worker.name}</h4>
                            {worker.isAvailable && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Available
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1">
                            {worker.designation && (
                              <p className="text-xs text-muted-foreground">
                                📋 {worker.designation}
                              </p>
                            )}
                            {worker.wardArea && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {worker.wardArea}
                              </p>
                            )}
                            {typeof worker.activeTasks === 'number' && typeof worker.maxTaskCapacity === 'number' && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {worker.activeTasks}/{worker.maxTaskCapacity} tasks
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAssignWorker(worker)}
                          disabled={isAssigning || isLoading}
                          className="whitespace-nowrap"
                        >
                          Assign
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900">
              💡 <strong>Tip:</strong> Workers are automatically filtered by the assigned department. The system prioritizes workers with fewer active tasks and better location proximity.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
