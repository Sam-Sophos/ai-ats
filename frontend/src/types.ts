export interface Role { id: number; title: string }
export interface Department { id: number; name: string }
export interface Skill { id: number; skill_name: string }
export interface Status { id: number; status_name: string; sequence_order: number }
export interface User { id: number; first_name: string; last_name: string; email: string; role: Role | null; department: Department | null; date_joined: string }
export interface LoginCredentials { email: string; password: string }
export interface AuthTokens { access: string; refresh: string }
export interface LoginResponse extends AuthTokens { user: User }
export interface JobList { id: number; title: string; department_name: string; created_by_name: string; skill_count: number; created_at: string }
export interface JobDetail { id: number; title: string; description: string; department: Department; created_by: User; skills: Skill[]; application_count: number; created_at: string }
export interface JobWritePayload { title: string; description: string; department: number; skill_ids: number[] }
export interface Candidate { id: number; first_name: string; last_name: string; email: string; phone: string; application_count: number }
export interface CandidateWritePayload { first_name: string; last_name: string; email: string; phone: string }
export interface StatusHistory { id: number; status: Status; changed_by: User | null; date_changed: string }
export interface AIProcessingLog { id: number; tokens_used: number; processing_time_ms: number; human_override_applied: boolean; created_at: string }
export interface JobOffer { id: number; salary_offered: string; target_start_date: string; is_accepted: boolean | null }
export interface ApplicationList { id: number; candidate_name: string; job_title: string; ai_match_score: number | null; current_status: Status | null; applied_date: string }
export interface ApplicationDetail { id: number; candidate: Candidate; job: JobList; ai_match_score: number | null; applied_date: string; resume_file: string; extracted_skills: Skill[]; current_status: Status | null; status_history: StatusHistory[]; offer: JobOffer | null; ai_log: AIProcessingLog | null; task_id?: string }
export interface Evaluation { id: number; evaluator: User; score: number; written_feedback: string; created_at: string }
export interface InterviewList { id: number; application: ApplicationList; scheduled_date: string; meeting_link: string; participant_count: number }
export interface InterviewDetail { id: number; application: ApplicationList; scheduled_date: string; meeting_link: string; participants: User[]; evaluations: Evaluation[] }
export interface InterviewWritePayload { application: number; scheduled_date: string; meeting_link: string; participant_ids: number[] }
export interface MessageTemplate { id: number; template_name: string; email_subject: string; email_body: string }
export interface CommunicationsLog { id: number; application: ApplicationList; sender: User; template: MessageTemplate; sent_date: string; message_content: string }
export interface PaginatedResponse<T> { count: number; next: string | null; previous: string | null; results: T[] }
export interface TaskStatusResponse { task_id: string; status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILURE'; result: { application_id?: number; ai_match_score?: number; extracted_skills?: string[]; tokens_used?: number; processing_time_ms?: number; error?: string } | null }
export interface CandidateRegisterPayload { first_name: string; last_name: string; email: string; phone?: string; password: string }
export interface CandidateLoginPayload { email: string; password: string }
export interface CandidateAuthResponse { access: string; refresh: string; candidate: Candidate }