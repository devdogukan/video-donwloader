from enum import StrEnum


class Status(StrEnum):
    PENDING = "pending"
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    MERGING = "merging"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"


class ServiceError(Exception): ...
class NotFoundError(ServiceError): ...
class ConflictError(ServiceError): ...
class ValidationError(ServiceError): ...
