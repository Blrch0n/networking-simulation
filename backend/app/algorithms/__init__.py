"""The five algorithms used by the local fiber-network planner and traffic API.

Inputs are validated by planning.validate before the application calls these
functions. Nodes use 'id'; edges use 'id', 'u', 'v', and positive 'length_km'.
"""
