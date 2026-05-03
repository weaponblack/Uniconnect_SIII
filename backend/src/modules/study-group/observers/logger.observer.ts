import { Observer, StudyGroupEvent } from './study-group.subject.js';

export class LoggerObserver implements Observer {
  async update(event: StudyGroupEvent, data: any): Promise<void> {
    console.log(`[StudyGroupEvent] ${event}:`, JSON.stringify(data, null, 2));
  }
}
