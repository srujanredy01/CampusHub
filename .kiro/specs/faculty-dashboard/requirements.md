# Requirements Document

## Introduction

The Faculty Dashboard is a comprehensive, production-grade module within CampusHub that provides faculty members with a centralized interface to manage students, attendance, assignments, grading, announcements, resources, communication, study groups, and events. The dashboard integrates with existing CampusHub apps (accounts, admin_dashboard, assignments, attendance, audit, study_groups, communication, events, resources, notifications) and delivers real-time updates via WebSockets using Django Channels and Redis. The UI follows modern LMS design patterns inspired by Google Classroom, Canvas LMS, Microsoft Teams for Education, and Notion.

## Glossary

- **Faculty_Dashboard**: The main landing page for faculty users displaying live widgets and summary statistics
- **Faculty_User**: A user with role "faculty" in the CampusHub accounts system
- **Section**: An academic section within a department (e.g., CSE-3A) as defined in the admin_dashboard Section model
- **Assigned_Section**: A section linked to a faculty member via the FacultyProfile.sections_assigned field
- **Assigned_Subject**: A subject linked to a faculty member via the FacultyProfile.subjects field
- **Attendance_Session**: A single class session where faculty marks attendance for students
- **Attendance_Record**: An individual student's attendance status within an Attendance_Session
- **Assignment**: A task created by faculty with a deadline, max marks, and optional file attachment
- **Submission**: A student's response to an Assignment, including content and optional file upload
- **Grade_Entry**: A marks record entered by faculty for a student in a specific subject and exam type
- **Faculty_Announcement**: A notice posted by faculty targeted to specific sections, subjects, or branches
- **Faculty_Resource**: An academic file (PDF, PPT, DOC, video) uploaded by faculty for students
- **Faculty_Chat**: A real-time messaging channel between faculty and students via WebSockets
- **Faculty_Event**: An event (workshop, hackathon, seminar) created and managed by faculty
- **Study_Group**: A collaborative group where faculty can participate as mentor, moderator, or observer
- **WebSocket_Consumer**: A Django Channels async consumer that pushes real-time updates to connected clients
- **RBAC_System**: The Role-Based Access Control system defined in accounts/rbac.py that governs module access
- **Notification_Service**: The system that delivers in-app and real-time notifications to users
- **Audit_Log**: A record of significant actions performed by users, stored via the audit app

## Requirements

### Requirement 1: Faculty Dashboard Home — Live Widgets

**User Story:** As a faculty member, I want to see a live dashboard with summary widgets when I log in, so that I can quickly assess my workload and student status at a glance.

#### Acceptance Criteria

1. WHEN a Faculty_User navigates to the Faculty_Dashboard, THE Faculty_Dashboard SHALL display the following widgets: Today's Classes count (Attendance_Sessions scheduled for the current date), Assigned Sections list, Total Students count (across all Assigned_Sections), Pending Assignment Reviews count (submissions with status "submitted" for the Faculty_User's Assignments), Pending Attendance Sessions count (sessions not yet finalized for the current date), Unread Messages count, Active Study Groups count, Upcoming Events count (Faculty_Events with starts_at within the next 7 days), Recent Resource Uploads list (up to 5 resources uploaded within the last 7 days), Recent Announcements list (up to 5 announcements received within the last 7 days), and Student Performance Alerts list (up to 10 active AttendanceAlerts for the Faculty_User's students)
2. WHEN the Faculty_Dashboard loads, THE WebSocket_Consumer SHALL establish a persistent connection to the faculty-specific channel group "faculty_{user_id}" within 5 seconds
3. WHEN a relevant data change occurs (new submission, new message, attendance alert, event registration), THE WebSocket_Consumer SHALL push an update message to the connected Faculty_User within 2 seconds
4. WHEN the WebSocket connection is lost, THE Faculty_Dashboard SHALL attempt automatic reconnection with exponential backoff starting at 1 second and capped at 30 seconds, up to 5 retries
5. THE Faculty_Dashboard SHALL render all widgets with current data fetched from the REST API on initial page load before the WebSocket connection is established
6. IF all 5 WebSocket reconnection attempts fail, THEN THE Faculty_Dashboard SHALL display a connection status indicator informing the Faculty_User that live updates are unavailable and provide a manual reconnect option while continuing to display the last successfully fetched widget data

### Requirement 2: Student Management — Section-Scoped Access

**User Story:** As a faculty member, I want to view and manage only the students in my assigned sections and subjects, so that I can focus on my responsibilities without accessing unrelated student data.

#### Acceptance Criteria

1. THE Faculty_Dashboard SHALL display only active students whose section, branch, and semester match at least one value in the Faculty_User's FacultyProfile.sections_assigned, branches_assigned, and semesters_assigned fields, ordered alphabetically by full name and paginated at 20 students per page
2. IF the Faculty_User's FacultyProfile has empty sections_assigned and branches_assigned lists, THEN THE Faculty_Dashboard SHALL display an empty student list with a message indicating no sections are currently assigned
3. WHEN a Faculty_User searches for a student, THE Faculty_Dashboard SHALL filter results by case-insensitive partial match on full name, student ID, or email within the Faculty_User's assigned scope
4. WHEN a Faculty_User selects a student profile, THE Faculty_Dashboard SHALL display the student's attendance summary (total classes, attended classes, and attendance percentage per subject), assignment submissions, grade history, CGPA, and study group participation
5. WHEN a Faculty_User applies filters (by section, subject, semester, or branch), THE Faculty_Dashboard SHALL narrow the student list to match all applied filter criteria simultaneously, showing only students that satisfy every selected filter
6. IF a Faculty_User attempts to access a student outside their assigned scope, THEN THE Faculty_Dashboard SHALL return a 403 Forbidden response with an error message indicating the student is not within the faculty member's assigned sections

### Requirement 3: Attendance Management — Session-Based Marking

**User Story:** As a faculty member, I want to mark attendance for my classes by section and subject, so that I can maintain accurate attendance records for students.

#### Acceptance Criteria

1. WHEN a Faculty_User creates an Attendance_Session, THE Faculty_Dashboard SHALL require selection of subject, branch, semester, section, date (not a future date), and period
2. IF a Faculty_User attempts to create an Attendance_Session with the same subject, branch, semester, section, date, and period as an existing session, THEN THE Faculty_Dashboard SHALL reject the request with an error message indicating a duplicate session exists
3. WHEN an Attendance_Session is created, THE Faculty_Dashboard SHALL auto-populate the student list for the selected section by retrieving all active students matching the selected branch, semester, and section from the accounts system
4. IF no active students are found for the selected branch, semester, and section, THEN THE Faculty_Dashboard SHALL display a message indicating no students are enrolled and prevent session creation
5. WHEN a Faculty_User marks attendance, THE Faculty_Dashboard SHALL accept status values of "present", "absent", "late", or "excused" for each student
6. WHEN a Faculty_User selects "Mark All Present" or "Mark All Absent", THE Faculty_Dashboard SHALL set the status for all students in the session to the selected value in a single operation
7. WHEN a Faculty_User finalizes an Attendance_Session, THE Faculty_Dashboard SHALL update each student's SubjectAttendance record (total_classes and attended_classes) and create an AttendanceHistory entry
8. WHILE an Attendance_Session is not finalized, THE Faculty_Dashboard SHALL allow the Faculty_User to edit individual student attendance records
9. IF a Faculty_User attempts to edit an Attendance_Session that is already finalized, THEN THE Faculty_Dashboard SHALL reject the edit and display a message indicating the session is finalized and cannot be modified
10. IF a Faculty_User attempts to mark attendance for a section not in their assigned scope (as defined by FacultyProfile sections_assigned, branches_assigned, and semesters_assigned), THEN THE Faculty_Dashboard SHALL reject the request with a 403 Forbidden response
11. WHEN a Faculty_User requests attendance export, THE Faculty_Dashboard SHALL generate a CSV file containing student name, student ID, subject, date, status, and attendance percentage for sessions belonging to that faculty member

### Requirement 4: Attendance Analytics

**User Story:** As a faculty member, I want to view attendance analytics and identify students with low attendance, so that I can intervene early and improve student outcomes.

#### Acceptance Criteria

1. WHEN a Faculty_User views attendance analytics, THE Faculty_Dashboard SHALL display section-wise average attendance percentage, subject-wise attendance percentage per subject for the current semester, and overall attendance distribution across all students in the Faculty_User's assigned scope
2. THE Faculty_Dashboard SHALL identify and list students with overall attendance below 75% as "low attendance" and below 50% as "critical attendance", calculated as the mean of all subject attendance percentages for each student within the Faculty_User's assigned sections
3. WHEN a student's overall attendance drops below 75% after an Attendance_Session is finalized, THE Faculty_Dashboard SHALL generate an AttendanceAlert with alert_level "warning" and notify the Faculty_User via WebSocket within 2 seconds
4. WHEN a student's overall attendance drops below 50% after an Attendance_Session is finalized, THE Faculty_Dashboard SHALL generate an AttendanceAlert with alert_level "danger" and notify the Faculty_User via WebSocket within 2 seconds
5. WHEN a Faculty_User views a student's attendance detail, THE Faculty_Dashboard SHALL display subject-wise attendance percentage, total classes, attended classes, missed classes, and classes needed to reach 75% for each subject in the current semester
6. IF no attendance records exist for the Faculty_User's assigned scope, THEN THE Faculty_Dashboard SHALL display an empty state indicating no attendance data is available

### Requirement 5: Assignment Management — Creation and Tracking

**User Story:** As a faculty member, I want to create assignments for my sections and subjects with deadlines and file attachments, so that students can submit their work digitally.

#### Acceptance Criteria

1. WHEN a Faculty_User creates an Assignment, THE Faculty_Dashboard SHALL require title (maximum 255 characters), description, subject, branch, semester, section, deadline (must be a future date-time), and max_marks (integer between 1 and 1000) fields
2. WHEN a Faculty_User creates an Assignment, THE Faculty_Dashboard SHALL accept an optional file attachment up to 50 MB in size
3. IF a Faculty_User attaches a file exceeding 50 MB, THEN THE Faculty_Dashboard SHALL reject the upload and display an error message indicating the file size limit has been exceeded
4. WHEN a Faculty_User enables late submissions, THE Faculty_Dashboard SHALL require a late_deadline field that is after the primary deadline
5. WHEN a Faculty_User views an Assignment, THE Faculty_Dashboard SHALL display a submission tracker updated via WebSocket showing counts for submitted, pending, late, and missing (students who have not submitted after the deadline has passed) submissions for that Assignment
6. WHEN a student submits an Assignment, THE WebSocket_Consumer SHALL notify the Faculty_User with the student name, assignment title, and submission timestamp
7. WHEN a Faculty_User views an Assignment's submissions, THE Faculty_Dashboard SHALL list all submissions with student name, submission time, status (pending, submitted, late, graded, or returned), file download link, and grade (if graded)

### Requirement 6: Assignment Review and Grading

**User Story:** As a faculty member, I want to review, comment on, return, and grade student submissions, so that I can provide timely feedback and marks.

#### Acceptance Criteria

1. WHEN a Faculty_User reviews a Submission, THE Faculty_Dashboard SHALL display the submission content, attached file with download option, submission timestamp, and late status indicator showing whether the submission was received after the Assignment deadline
2. WHEN a Faculty_User grades a Submission that has a status of "submitted" or "late", THE Faculty_Dashboard SHALL require marks as a numeric value between 0 and the Assignment's max_marks (inclusive) and accept optional feedback text up to 5000 characters
3. WHEN a Faculty_User returns a Submission for revision, THE Faculty_Dashboard SHALL set the submission status to "returned", clear any previously assigned marks, and notify the student via the Notification_Service
4. WHEN a Faculty_User adds a comment to a Submission, THE Faculty_Dashboard SHALL validate that the comment content is not empty and does not exceed 2000 characters, create an AssignmentComment record, and notify the student via the Notification_Service
5. IF a Faculty_User enters marks exceeding the Assignment's max_marks or below 0, THEN THE Faculty_Dashboard SHALL reject the input with an error message indicating the valid marks range
6. WHEN a Faculty_User downloads all submissions for an Assignment, THE Faculty_Dashboard SHALL generate a ZIP file containing all submitted files named by student ID
7. IF a Faculty_User attempts to grade a Submission that has a status of "returned" or "pending", THEN THE Faculty_Dashboard SHALL reject the action with an error message indicating that only submitted or late submissions can be graded
8. IF a Faculty_User requests a bulk download for an Assignment that has no submissions with attached files, THEN THE Faculty_Dashboard SHALL display an informational message indicating no files are available for download
9. IF a Faculty_User adds a comment with empty content or content exceeding 2000 characters, THEN THE Faculty_Dashboard SHALL reject the comment with an error message indicating the content length requirements

### Requirement 7: Grading System — Multi-Type Grade Entry

**User Story:** As a faculty member, I want to enter and manage grades for various exam types (internals, labs, projects, quizzes), so that I can maintain a complete academic record for students.

#### Acceptance Criteria

1. WHEN a Faculty_User enters grades, THE Faculty_Dashboard SHALL require student, subject, semester, section, exam_type, marks_obtained, and max_marks fields, where marks_obtained is a numeric value between 0 and max_marks (inclusive) and max_marks is a numeric value between 1 and 100
2. THE Faculty_Dashboard SHALL support the following exam types: internal_1, internal_2, internal_3, mid_term, end_term, assignment, lab, project, quiz, and viva
3. IF a Faculty_User submits a Grade_Entry where a record already exists for the same student, subject, semester, and exam_type combination, THEN THE Faculty_Dashboard SHALL update the existing Grade_Entry with the new marks_obtained and max_marks values
4. WHEN a Faculty_User uploads a CSV file for bulk grade entry, THE Faculty_Dashboard SHALL accept a file up to 5MB containing columns student_id, subject, semester, section, exam_type, marks_obtained, and max_marks, parse the file, and create Grade_Entry records for each valid row up to a maximum of 500 rows per file
5. IF a CSV row contains invalid data (missing required fields, marks_obtained exceeding max_marks, marks_obtained below 0, unknown student ID, or unrecognized exam_type), THEN THE Faculty_Dashboard SHALL skip the invalid row and include it in an error summary returned to the Faculty_User indicating the row number and the reason for rejection
6. WHEN a Faculty_User publishes grades for a selected subject and exam_type, THE Faculty_Dashboard SHALL mark all unpublished Grade_Entry records matching that subject and exam_type as published and notify each affected student via the Notification_Service
7. WHEN a Faculty_User views grade analytics for a subject and exam_type, THE Faculty_Dashboard SHALL display the top 10 performers by marks_obtained, students scoring below pass threshold (below 40% of max_marks), section average percentage, pass rate percentage, and subject-wise performance comparison across exam types

### Requirement 8: Academic Analytics — Interactive Charts

**User Story:** As a faculty member, I want to view interactive charts showing attendance trends, grade distributions, and student progress, so that I can make data-driven decisions about my teaching.

#### Acceptance Criteria

1. WHEN a Faculty_User views academic analytics, THE Faculty_Dashboard SHALL display attendance trend charts (line chart with daily data points over the selected date range), grade distribution charts (histogram with mark ranges in 10-point intervals), and assignment completion rate charts (bar chart per assignment)
2. THE Faculty_Dashboard SHALL allow filtering analytics by section, subject, semester, and date range, with a default date range of the past 30 days and a maximum selectable span of 365 days
3. WHEN a Faculty_User selects a specific student in analytics, THE Faculty_Dashboard SHALL display that student's attendance percentage and grade percentage per Assigned_Subject over the selected date range, rendered as trend lines
4. THE Faculty_Dashboard SHALL calculate and display section-level metrics: class average, median, standard deviation, and pass rate (percentage of students scoring at or above 40% of max_marks) for each exam type
5. WHEN analytics data changes (new grades entered, attendance marked), THE Faculty_Dashboard SHALL refresh the affected charts within 5 seconds via WebSocket notification
6. IF the selected filter combination yields no data for a chart, THEN THE Faculty_Dashboard SHALL display an empty state illustration with the message indicating that no data is available for the selected filters

### Requirement 9: Announcements — Bidirectional Communication

**User Story:** As a faculty member, I want to receive announcements from administrators and send announcements to my assigned sections, so that important information reaches the right audience promptly.

#### Acceptance Criteria

1. WHEN an Admin or Super Admin publishes an AdminFacultyAnnouncement, THE Faculty_Dashboard SHALL display the announcement in the Faculty_User's announcements feed with title, content, priority, announcement_type, timestamp, and attachment download link (if present)
2. WHEN a Faculty_User creates a FacultyAnnouncement, THE Faculty_Dashboard SHALL require a title (maximum 255 characters), content, and at least one non-empty target field (target_branch, target_semester, target_section, or target_subject) that falls within the Faculty_User's assigned scope
3. WHEN a FacultyAnnouncement is published, THE Notification_Service SHALL deliver the announcement to all students whose branch, semester, section, or enrolled subject matches the announcement's non-empty target fields
4. WHEN a new announcement is received, THE WebSocket_Consumer SHALL push the announcement to the Faculty_User within 2 seconds of publication
5. THE Faculty_Dashboard SHALL support announcement priorities: low, normal, high, and urgent, with urgent announcements displayed with a distinct visual indicator (background color or icon badge) that differentiates them from non-urgent announcements
6. WHEN a Faculty_User pins an announcement, THE Faculty_Dashboard SHALL display the pinned announcement at the top of the announcements list regardless of creation date, with a maximum of 5 pinned announcements per Faculty_User
7. IF a Faculty_User attempts to create a FacultyAnnouncement targeting a branch, semester, or section outside their assigned scope, THEN THE Faculty_Dashboard SHALL reject the request with an error message indicating the target is not within the Faculty_User's assigned scope
8. IF the WebSocket connection is unavailable when a new announcement is published, THEN THE Faculty_Dashboard SHALL retrieve the announcement on the next REST API fetch so that no announcements are lost

### Requirement 10: Faculty Chat — Real-Time Messaging

**User Story:** As a faculty member, I want to exchange real-time messages with students including text, files, and images, so that I can provide academic support outside class hours.

#### Acceptance Criteria

1. WHEN a Faculty_User opens a chat with a student, THE FacultyChatConsumer SHALL establish a WebSocket connection to the group "faculty_chat_{chat_id}" and deliver the most recent 50 messages as chat history
2. WHEN a Faculty_User sends a text message of 1 to 5000 characters, THE FacultyChatConsumer SHALL broadcast the message (including sender name, sender role, content, message type, and timestamp) to all participants in the chat group within 1 second
3. WHEN a participant is typing, THE FacultyChatConsumer SHALL broadcast a typing indicator to other participants in the chat, excluding the sender
4. WHEN a participant reads messages, THE FacultyChatConsumer SHALL mark all unread messages from the other party as read and broadcast a read receipt with the reader's ID and timestamp
5. WHEN a Faculty_User sends a file or image up to 25MB in size, THE Faculty_Dashboard SHALL upload the file to the server and include the file URL and file name in the chat message with message_type set to "file" or "image"
6. THE Faculty_Dashboard SHALL display chat messages with sender name, role badge (Faculty/Student), timestamp, read status, and message type indicator (text, file, image, or announcement)
7. WHEN a new message arrives while the Faculty_User is not in the chat view, THE Faculty_Dashboard SHALL increment the unread message counter on the dashboard widget
8. IF a user attempts to connect to a Faculty_Chat they are not a participant of, THEN THE FacultyChatConsumer SHALL reject the WebSocket connection and close with code 4003
9. IF a Faculty_User sends a message to an inactive chat (is_active is false), THEN THE FacultyChatConsumer SHALL reject the message and not broadcast it to the group

### Requirement 11: Study Group Oversight

**User Story:** As a faculty member, I want to join study groups as a mentor or moderator, so that I can guide discussions, answer questions, and share resources with students.

#### Acceptance Criteria

1. WHEN a Faculty_User views study groups, THE Faculty_Dashboard SHALL display only groups associated with the Faculty_User's assigned sections or subjects, showing group name, member count, subject, and last activity timestamp
2. WHEN a Faculty_User joins a Study_Group, THE Faculty_Dashboard SHALL assign the role of "mentor", "moderator", or "observer" based on the Faculty_User's selection and notify group members of the faculty joining
3. WHILE a Faculty_User is a member of a Study_Group, THE Faculty_Dashboard SHALL display group discussions (paginated at 20 messages per page), shared resources, and member activity
4. WHEN a Faculty_User posts in a Study_Group, THE Faculty_Dashboard SHALL mark the message with a "Faculty" badge visible to all group members and broadcast the message via WebSocket
5. WHEN new activity occurs in a Faculty_User's joined groups, THE WebSocket_Consumer SHALL notify the Faculty_User with the group name, activity type, and actor name within 2 seconds
6. IF a Faculty_User with role "moderator" removes a message from a Study_Group, THEN THE Faculty_Dashboard SHALL soft-delete the message and notify the message author
7. IF a Faculty_User with role "observer" attempts to post in a Study_Group, THEN THE Faculty_Dashboard SHALL reject the action with a message indicating observers cannot post

### Requirement 12: Resource Management — Upload and Categorization

**User Story:** As a faculty member, I want to upload and manage academic resources (PDFs, PPTs, videos, lab manuals) for my students, so that they have access to verified study materials.

#### Acceptance Criteria

1. WHEN a Faculty_User uploads a FacultyResource, THE Faculty_Dashboard SHALL require title (maximum 255 characters), subject, resource_type, and file (up to 100MB) fields, and accept optional description (up to 2000 characters), branch, semester, and section fields
2. THE Faculty_Dashboard SHALL support resource types: notes, ppt, pdf, recording, syllabus, question_paper, and other
3. WHEN a FacultyResource is uploaded, THE Faculty_Dashboard SHALL automatically set is_verified to true and display a "Faculty Verified" badge visible to students
4. WHEN a Faculty_User pins a resource, THE Faculty_Dashboard SHALL display the pinned resource at the top of the resource list for the target section, with a maximum of 10 pinned resources per section
5. THE Faculty_Dashboard SHALL allow Faculty_Users to edit resource metadata (title, description, subject) and delete resources they created, with a confirmation dialog before deletion
6. WHEN a Faculty_User views resource analytics, THE Faculty_Dashboard SHALL display download count, view count, bookmark count, and comment count for each resource
7. IF a Faculty_User attempts to upload a file exceeding 100MB, THEN THE Faculty_Dashboard SHALL reject the upload with an error message indicating the maximum file size
8. IF a Faculty_User attempts to delete or edit a resource they did not create, THEN THE Faculty_Dashboard SHALL reject the action with a 403 Forbidden response

### Requirement 13: Event Management — Full Lifecycle

**User Story:** As a faculty member, I want to create and manage academic events (hackathons, workshops, seminars, guest lectures), so that I can organize extracurricular activities for students.

#### Acceptance Criteria

1. WHEN a Faculty_User creates a FacultyEvent, THE Faculty_Dashboard SHALL require title (maximum 255 characters), description, event_type, starts_at (must be a future date-time), ends_at (must be after starts_at), and max_participants (integer between 1 and 10000) fields
2. THE Faculty_Dashboard SHALL support event types: workshop, hackathon, seminar, coding_contest, guest_lecture, department_meeting, lab_session, project_review, and other
3. WHEN a Faculty_User publishes an event with status "registration_open", THE Notification_Service SHALL notify eligible students based on target branch, semester, and section within 5 seconds
4. WHEN a student registers for a FacultyEvent, THE WebSocket_Consumer SHALL notify the Faculty_User with the student name, registration timestamp, and current registration count
5. WHEN a Faculty_User marks event attendance, THE Faculty_Dashboard SHALL update the FacultyEventRegistration.attended field for each registered student and display a summary of present vs absent attendees
6. WHEN a Faculty_User uploads an event poster, THE Faculty_Dashboard SHALL accept image files (JPEG, PNG, WebP) up to 10MB and display the poster on the event detail page
7. WHEN a FacultyEvent reaches max_participants registrations, THE Faculty_Dashboard SHALL automatically set the event status to "registration_closed" and display "Registration Full" status to students
8. IF a Faculty_User attempts to create an event with ends_at before starts_at, THEN THE Faculty_Dashboard SHALL reject the request with an error message indicating the end time must be after the start time
9. IF a student attempts to register for an event that has reached max_participants, THEN THE Faculty_Dashboard SHALL reject the registration with a message indicating the event is full

### Requirement 14: Live Notifications — WebSocket Delivery

**User Story:** As a faculty member, I want to receive instant notifications for important events (submissions, messages, alerts, registrations), so that I can respond promptly to student needs.

#### Acceptance Criteria

1. WHEN a student submits an Assignment created by the Faculty_User, THE WebSocket_Consumer SHALL deliver a notification with type "new_submission" containing student name, assignment title, and timestamp within 2 seconds
2. WHEN a student sends a chat message to the Faculty_User, THE WebSocket_Consumer SHALL deliver a notification with type "new_chat_message" containing sender name and message preview (first 100 characters) within 1 second
3. WHEN a student's attendance drops below the warning threshold (75%), THE WebSocket_Consumer SHALL deliver a notification with type "attendance_alert" containing student name, subject, and current percentage within 2 seconds
4. WHEN a student registers for a Faculty_User's event, THE WebSocket_Consumer SHALL deliver a notification with type "event_registration" containing student name, event title, and current registration count within 2 seconds
5. WHEN an Admin publishes an announcement targeting the Faculty_User, THE WebSocket_Consumer SHALL deliver a notification with type "announcement_received" containing title and priority within 2 seconds
6. THE Faculty_Dashboard SHALL display a notification bell icon with an unread count badge that updates in real-time, capped at displaying "99+" for counts exceeding 99
7. WHEN a Faculty_User clicks the notification bell, THE Faculty_Dashboard SHALL display the 20 most recent notifications in reverse chronological order with read/unread status indicators
8. WHEN a Faculty_User marks a notification as read, THE Faculty_Dashboard SHALL decrement the unread count badge and update the notification's visual state

### Requirement 15: Faculty Profile Management

**User Story:** As a faculty member, I want to manage my professional profile including department, subjects, office hours, and contact information, so that students and administrators can find relevant information about me.

#### Acceptance Criteria

1. WHEN a Faculty_User views their profile, THE Faculty_Dashboard SHALL display full name, employee ID, designation, department, specialization, qualification, experience years, assigned subjects, assigned sections, office location, office hours, and phone extension
2. WHEN a Faculty_User updates their profile, THE Faculty_Dashboard SHALL accept editable fields: specialization, qualification, experience_years, office_location, office_hours (text format, maximum 500 characters), and phone_extension, and save changes to the FacultyProfile model
3. THE Faculty_Dashboard SHALL display faculty statistics: total students managed (count of students in assigned sections), total assignments created, total attendance sessions conducted, and total resources uploaded
4. IF a Faculty_User attempts to modify sections_assigned, branches_assigned, or semesters_assigned fields, THEN THE Faculty_Dashboard SHALL reject the change with the message "Section assignments can only be modified by administrators"
5. IF a Faculty_User submits a profile update with invalid data (empty required fields or experience_years below 0), THEN THE Faculty_Dashboard SHALL reject the update with field-specific error messages

### Requirement 16: Faculty Activity Analytics

**User Story:** As a faculty member, I want to view my own activity metrics (resources uploaded, assignments created, student engagement, response rate), so that I can track my productivity and improve my teaching effectiveness.

#### Acceptance Criteria

1. WHEN a Faculty_User views their activity analytics, THE Faculty_Dashboard SHALL display total resources uploaded, total assignments created, average grading turnaround time, chat response rate, events created count, and total event registrations received, calculated over the current academic semester by default
2. THE Faculty_Dashboard SHALL calculate chat response rate as the percentage of student messages in DirectConversations where the Faculty_User is a participant that received a Faculty_User reply within 24 hours of the student message timestamp
3. THE Faculty_Dashboard SHALL calculate average grading turnaround time as the mean duration between the submitted_at timestamp and the graded_at timestamp for all submissions graded by the Faculty_User within the selected time period
4. WHEN a Faculty_User views engagement metrics, THE Faculty_Dashboard SHALL display resource download counts per day, assignment submission rate as the percentage of enrolled students who submitted each assignment, and student message count per day directed to the Faculty_User, aggregated over the past 30 days
5. IF a Faculty_User has no activity data for the selected time period, THEN THE Faculty_Dashboard SHALL display a zero-state indicator showing "0" for each numeric metric and an empty state message for trend charts

### Requirement 17: Role-Based Access Control — Faculty Scope Enforcement

**User Story:** As a system administrator, I want to ensure faculty members can only access data within their assigned scope and cannot access admin or moderator features, so that data privacy and system security are maintained.

#### Acceptance Criteria

1. THE RBAC_System SHALL grant Faculty_Users only the permissions defined in ROLE_PERMISSIONS["faculty"] from the accounts/rbac.py configuration, which includes access to faculty_dashboard, attendance, assignments, grades, announcements, chat, study_groups, resources, and events modules
2. IF a Faculty_User sends an API request to an admin-only endpoint (any URL under /api/admin/), THEN THE Faculty_Dashboard SHALL return a 403 Forbidden response with the message "Permission denied: admin access required"
3. IF a Faculty_User sends an API request to a moderator-only endpoint, THEN THE Faculty_Dashboard SHALL return a 403 Forbidden response with the message "Permission denied: moderator access required"
4. THE Faculty_Dashboard SHALL filter all database queries by the Faculty_User's assigned sections, branches, and semesters using Django ORM queryset filtering to prevent data leakage across faculty boundaries
5. WHEN an Admin views faculty activity, THE Faculty_Dashboard SHALL provide read-only access to the faculty member's dashboard statistics, assignments created, attendance sessions conducted, and resources uploaded
6. WHEN a Super Admin audits faculty actions, THE Audit_Log SHALL contain records of all significant faculty operations including attendance marking, grade entry, grade publishing, assignment creation, resource uploads, and event creation, with actor, action, target, and timestamp fields
7. THE Faculty_Dashboard SHALL validate the Faculty_User's JWT authentication token on every API request and WebSocket connection attempt, rejecting expired or invalid tokens with a 401 Unauthorized response

### Requirement 18: Data Export and Reporting

**User Story:** As a faculty member, I want to export attendance records, grade sheets, and submission reports as CSV files, so that I can maintain offline records and share data with administrators.

#### Acceptance Criteria

1. WHEN a Faculty_User exports attendance data, THE Faculty_Dashboard SHALL generate a CSV file with columns: Student Name, Student ID, Subject, Date, Period, Status, and Attendance Percentage, filtered to only include data within the Faculty_User's assigned scope
2. WHEN a Faculty_User exports grade data, THE Faculty_Dashboard SHALL generate a CSV file with columns: Student Name, Student ID, Subject, Exam Type, Marks Obtained, Max Marks, and Percentage, filtered to only include grades entered by the Faculty_User
3. WHEN a Faculty_User exports submission data for an Assignment, THE Faculty_Dashboard SHALL generate a CSV file with columns: Student Name, Student ID, Status, Submitted At, Marks, and Feedback for all students assigned to that Assignment
4. THE Faculty_Dashboard SHALL include a date range filter for all export operations, with a default range of the current semester and a maximum exportable range of 1 academic year
5. IF the export dataset exceeds 10000 rows, THEN THE Faculty_Dashboard SHALL process the export asynchronously using a Celery task and notify the Faculty_User via WebSocket when the file is ready for download
6. IF the export dataset is empty (no records match the selected filters), THEN THE Faculty_Dashboard SHALL display a message indicating no data is available for export instead of generating an empty file

### Requirement 19: UI/UX — Modern Professional Interface

**User Story:** As a faculty member, I want a clean, modern, and professional interface that is intuitive to navigate, so that I can efficiently manage my teaching responsibilities without confusion.

#### Acceptance Criteria

1. THE Faculty_Dashboard SHALL render a responsive layout that adapts to desktop (1024px and above), tablet (768px to 1023px), and mobile (below 768px) viewports without horizontal scrolling
2. THE Faculty_Dashboard SHALL display a sidebar navigation with sections: Teaching (Dashboard, Students, Attendance, Assignments, Grades, Analytics, Announcements) and Faculty Tools (Chat, Study Groups, Resources, Events) as defined in the SIDEBAR_CONFIG, with the sidebar collapsible on tablet and hidden behind a hamburger menu on mobile
3. THE Faculty_Dashboard SHALL use consistent color coding for status indicators: green (#22c55e) for success/present, red (#ef4444) for danger/absent, yellow (#eab308) for warning/late, and blue (#3b82f6) for information
4. THE Faculty_Dashboard SHALL display loading skeletons during data fetch operations and empty state illustrations with descriptive text when no data is available
5. THE Faculty_Dashboard SHALL provide keyboard navigation support and ARIA labels for all interactive elements to meet WCAG 2.1 Level AA compliance
6. WHEN a Faculty_User performs a destructive action (delete resource, finalize attendance, delete event), THE Faculty_Dashboard SHALL display a confirmation dialog with the action description and a cancel option before executing the action
7. THE Faculty_Dashboard SHALL display toast notifications for successful operations (save, create, delete) that auto-dismiss after 5 seconds
8. THE Faculty_Dashboard SHALL maintain the current scroll position and active filters when navigating back from a detail view to a list view

### Requirement 20: Performance and Reliability

**User Story:** As a faculty member, I want the dashboard to load quickly and handle concurrent operations reliably, so that I can work efficiently even during peak usage times.

#### Acceptance Criteria

1. THE Faculty_Dashboard SHALL load the initial dashboard view (all widgets populated) within 3 seconds when measured on a connection with at least 10 Mbps download speed and latency below 100ms
2. THE Faculty_Dashboard SHALL paginate all list views (students, submissions, grades, resources) with a default page size of 20 items and support configurable page sizes of 10, 20, 50, or 100 items
3. WHEN multiple Faculty_Users mark attendance simultaneously for the same section and period, THE Faculty_Dashboard SHALL handle concurrent writes without data corruption using database-level unique constraints
4. IF a concurrent write conflict is detected during attendance marking, THEN THE Faculty_Dashboard SHALL reject the later request and display an error message indicating that the record was already modified, prompting the Faculty_User to refresh and retry
5. THE Faculty_Dashboard SHALL cache frequently accessed data (student lists, section metadata) in Redis with a TTL of 5 minutes
6. IF a REST API request does not receive a response within 30 seconds, THEN THE Faculty_Dashboard SHALL treat the request as failed
7. IF a REST API request fails, THEN THE Faculty_Dashboard SHALL display a non-technical error message indicating the nature of the failure, provide a retry option limited to a maximum of 3 attempts, and preserve all unsaved form field values until the Faculty_User navigates away from the page
