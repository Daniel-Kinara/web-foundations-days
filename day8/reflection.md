# Reflection

The most difficult concept in the course was designing for scale: understanding how a cache, read replicas, queues and a load balancer work together while the data stays correct. At first I saw them as a list of tools to memorise. What helped was doing the numbers first. When I worked out reads and writes per second for QuickNotes and later for a big ticket sale, I could see why a read-heavy system needs a cache and replicas, and why something that must be exact, like selling a seat, has to go through the primary database in a transaction. Drawing each architecture and tracing a request through it step by step turned the ideas into something I could explain.

For my capstone, I would improve the API client and the design documents. The client only worked against JSONPlaceholder, which never saves anything, so I would build a small real backend with a PostgreSQL database to test my own API design. I would also add more detail on failure: my flow diagrams mostly showed the happy path, and I would show what happens when the cache, the queue or a server goes down.

Next, I want to learn to build and deploy a real backend with a web framework and PostgreSQL, so I can turn these designs into working code. After that, I plan to move into machine learning and AI engineering, which is the career path I am working towards.
