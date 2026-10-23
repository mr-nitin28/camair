'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog } from '@/components/ui/dialog';

const leaveFormSchema = z
  .object({
    leaveType: z.enum(['Medical', 'Personal', 'On Duty', 'Academic Event']),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z
      .string()
      .min(10, 'Please provide a clear reason (at least 10 characters)')
      .max(500, 'Reason cannot exceed 500 characters'),
    attachmentName: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return new Date(data.endDate) >= new Date(data.startDate);
    },
    {
      message: 'End date cannot be earlier than start date',
      path: ['endDate'],
    }
  );

export type LeaveFormValues = z.infer<typeof leaveFormSchema>;

export interface ApplyLeaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: LeaveFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

export default function ApplyLeaveDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: ApplyLeaveDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      leaveType: 'Medical',
      startDate: '',
      endDate: '',
      reason: '',
      attachmentName: '',
    },
  });

  const handleFormSubmit = async (values: LeaveFormValues) => {
    await onSubmit(values);
    reset();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Submit Leave Application"
      description="Fill out the official leave request for institutional review"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 p-1">
        {/* Leave Type */}
        <div>
          <label className="text-xs font-bold text-[var(--text)] block mb-1">
            Leave Type <span className="text-rose-500">*</span>
          </label>
          <select
            {...register('leaveType')}
            className="w-full text-xs py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-semibold focus:ring-2 focus:ring-[var(--accent)]"
          >
            <option value="Medical">Medical Leave (Doctor Certificate)</option>
            <option value="On Duty">On Duty (Hackathons, Competitions, Sports)</option>
            <option value="Personal">Personal Emergency</option>
            <option value="Academic Event">Academic Conference / Workshop</option>
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1">
              Start Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              {...register('startDate')}
              className="w-full text-xs py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-semibold"
            />
            {errors.startDate && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.startDate.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1">
              End Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              {...register('endDate')}
              className="w-full text-xs py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-semibold"
            />
            {errors.endDate && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.endDate.message}</p>
            )}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="text-xs font-bold text-[var(--text)] block mb-1">
            Reason / Medical Summary <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="State reason clearly with doctor diagnosis or event details..."
            {...register('reason')}
            className="w-full text-xs p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--accent)] resize-none"
          />
          {errors.reason && (
            <p className="text-[11px] text-rose-500 mt-1">{errors.reason.message}</p>
          )}
        </div>

        {/* Attachment */}
        <div>
          <label className="text-xs font-bold text-[var(--text)] block mb-1">
            Supporting Document / Prescription (PDF/Image)
          </label>
          <input
            type="text"
            placeholder="e.g. medical_certificate_dr_sharma.pdf"
            {...register('attachmentName')}
            className="w-full text-xs py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-mono placeholder-[var(--text-muted)]"
          />
          <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
            Files uploaded to private Supabase Storage bucket with signed URL access.
          </span>
        </div>

        {/* Submit / Cancel Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:opacity-80 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
