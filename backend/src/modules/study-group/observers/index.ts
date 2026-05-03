import { StudyGroupSubject } from './study-group.subject.js';
import { NotificationObserver } from './notification.observer.js';
import { LoggerObserver } from './logger.observer.js';

const studyGroupSubject = StudyGroupSubject.getInstance();

// Register observers
studyGroupSubject.attach(new NotificationObserver());
studyGroupSubject.attach(new LoggerObserver());

export { studyGroupSubject };
