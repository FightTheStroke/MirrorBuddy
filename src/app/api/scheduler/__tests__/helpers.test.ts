/**
 * Tests for Scheduler API Helpers
 */

import { describe, it, expect } from 'vitest';
import {
  extractPreferencesData,
  createScheduleSessionData,
  createReminderData,
  updateSessionData,
  updateReminderData,
} from '../helpers';

describe('scheduler-helpers', () => {
  describe('extractPreferencesData', () => {
    it('extracts preferences fields', () => {
      const data = {
        enabledNotifications: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        minIntervalMinutes: 30,
        streakWarningTime: '09:00',
      };
      const result = extractPreferencesData(data);

      expect(result.enabledNotifications).toBe(true);
      expect(result.quietHoursStart).toBe('22:00');
      expect(result.quietHoursEnd).toBe('08:00');
      expect(result.minIntervalMinutes).toBe(30);
      expect(result.streakWarningTime).toBe('09:00');
    });

    it('extracts only known preference fields', () => {
      const data = {
        enabledNotifications: true,
        quietHoursStart: '23:00',
      };
      const result = extractPreferencesData(data);

      expect(result.enabledNotifications).toBe(true);
      expect(result.quietHoursStart).toBe('23:00');
    });

    it('handles undefined fields', () => {
      const data = {};
      const result = extractPreferencesData(data);

      expect(result.enabledNotifications).toBeUndefined();
    });
  });

  describe('createScheduleSessionData', () => {
    it('creates session data with all fields', () => {
      const data = {
        dayOfWeek: 1,
        time: '10:00',
        duration: 45,
        subject: 'math',
        maestroId: 'euclide',
        topic: 'algebra',
        reminderOffset: 10,
        repeat: 'daily',
      };
      const result = createScheduleSessionData(data);

      expect(result.dayOfWeek).toBe(1);
      expect(result.time).toBe('10:00');
      expect(result.duration).toBe(45);
      expect(result.subject).toBe('math');
      expect(result.maestroId).toBe('euclide');
      expect(result.topic).toBe('algebra');
      expect(result.active).toBe(true);
      expect(result.reminderOffset).toBe(10);
      expect(result.repeat).toBe('daily');
    });

    it('applies default values', () => {
      const data = {
        dayOfWeek: '2',
        time: '14:00',
        subject: 'history',
      };
      const result = createScheduleSessionData(data);

      expect(result.duration).toBe(30);
      expect(result.reminderOffset).toBe(5);
      expect(result.repeat).toBe('weekly');
      expect(result.active).toBe(true);
    });

    it('converts string dayOfWeek to number', () => {
      const data = {
        dayOfWeek: '3',
        time: '10:00',
        subject: 'math',
      };
      const result = createScheduleSessionData(data);

      expect(result.dayOfWeek).toBe(3);
      expect(typeof result.dayOfWeek).toBe('number');
    });

    it('handles undefined optional fields', () => {
      const data = {
        dayOfWeek: 0,
        time: '09:00',
        subject: 'science',
      };
      const result = createScheduleSessionData(data);

      expect(result.maestroId).toBeUndefined();
      expect(result.topic).toBeUndefined();
    });
  });

  describe('createReminderData', () => {
    it('creates reminder data with all fields', () => {
      const data = {
        datetime: '2024-01-15T10:00:00',
        message: 'Study time!',
        subject: 'math',
        maestroId: 'euclide',
        repeat: 'daily',
      };
      const result = createReminderData(data);

      expect(result.datetime).toBeInstanceOf(Date);
      expect(result.message).toBe('Study time!');
      expect(result.subject).toBe('math');
      expect(result.maestroId).toBe('euclide');
      expect(result.repeat).toBe('daily');
      expect(result.active).toBe(true);
    });

    it('applies default values', () => {
      const data = {
        datetime: '2024-01-15T10:00:00',
        message: 'Reminder',
      };
      const result = createReminderData(data);

      expect(result.repeat).toBe('none');
      expect(result.active).toBe(true);
      expect(result.subject).toBeUndefined();
      expect(result.maestroId).toBeUndefined();
    });

    it('parses datetime string correctly', () => {
      const data = {
        datetime: '2024-06-15T14:30:00',
        message: 'Test',
      };
      const result = createReminderData(data);

      expect(result.datetime.getFullYear()).toBe(2024);
      expect(result.datetime.getMonth()).toBe(5); // June = 5
      expect(result.datetime.getDate()).toBe(15);
    });
  });

  describe('updateSessionData', () => {
    it('includes only provided fields', () => {
      const data = {
        time: '11:00',
        duration: 60,
      };
      const result = updateSessionData(data);

      expect(result.time).toBe('11:00');
      expect(result.duration).toBe(60);
      expect(result.dayOfWeek).toBeUndefined();
      expect(result.subject).toBeUndefined();
    });

    it('converts types correctly', () => {
      const data = {
        dayOfWeek: '5',
        duration: '45',
        active: 1,
      };
      const result = updateSessionData(data);

      expect(result.dayOfWeek).toBe(5);
      expect(result.duration).toBe(45);
      expect(result.active).toBe(true);
    });

    it('handles null values for optional string fields', () => {
      const data = {
        maestroId: null,
        topic: null,
      };
      const result = updateSessionData(data);

      expect(result.maestroId).toBeNull();
      expect(result.topic).toBeNull();
    });

    it('handles empty string for maestroId and topic', () => {
      const data = {
        maestroId: '',
        topic: '',
      };
      const result = updateSessionData(data);

      expect(result.maestroId).toBeNull();
      expect(result.topic).toBeNull();
    });

    it('returns empty object for no fields', () => {
      const result = updateSessionData({});
      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('updateReminderData', () => {
    it('includes only provided fields', () => {
      const data = {
        message: 'Updated message',
        active: false,
      };
      const result = updateReminderData(data);

      expect(result.message).toBe('Updated message');
      expect(result.active).toBe(false);
      expect(result.datetime).toBeUndefined();
    });

    it('parses datetime correctly', () => {
      const data = {
        datetime: '2024-12-25T09:00:00',
      };
      const result = updateReminderData(data);

      expect(result.datetime).toBeInstanceOf(Date);
      expect((result.datetime as Date).getMonth()).toBe(11); // December
    });

    it('handles null values for optional fields', () => {
      const data = {
        subject: null,
        maestroId: null,
      };
      const result = updateReminderData(data);

      expect(result.subject).toBeNull();
      expect(result.maestroId).toBeNull();
    });

    it('handles empty strings for optional fields', () => {
      const data = {
        subject: '',
        maestroId: '',
      };
      const result = updateReminderData(data);

      expect(result.subject).toBeNull();
      expect(result.maestroId).toBeNull();
    });
  });
});
