Follow PROJECT_SPEC.md strictly.

Hard rules:
- Never expose vendor pricing to customers
- Store all money in INR paise (integers only)
- Keep customer frontend ultra-light (<50KB, no frameworks)
- Admin panel can use React + Tailwind CDN
- Separate controllers, services, routes in backend
- Use Prisma for database
- All external APIs must be TODO[INTEGRATION]
- Never mix pricing logic inside route handlers
- Always sanitize API responses for customers