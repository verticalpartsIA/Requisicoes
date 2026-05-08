import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  Key, Plus, ChevronRight, ChevronLeft, CalendarIcon, Cog, ClipboardList, AlertTriangle,
} from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { TicketsTable, type TicketRow } from "@/components/tickets-table";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { friendlySupabaseError } from "@/lib/supabase-error";
import { useAuth } from "@/features/auth/auth-context";
import { toast } from "sonner";
import { notifyVpClickClient } from "@/features/vpclick/client";

const EQUIPMENT_CATEGORIES = [
  { value: "GUINDASTE", label: "Guindaste" },
  { value: "PLATAFORMA", label: "Plataforma Elevatória" },
  { value: "ANDAIME", label: "Andaime Tubular" },
  { value: "BETONEIRA", label: "Betoneira" },
  { value: "ESCAVADEIRA", label: "Escavadeira / Retroescavadeira" },
  { value: "GERADOR", label: "Gerador" },
  { value: "COMPRESSOR", label: "Compressor" },
  { value: "EMPILHADEIRA", label: "Empilhadeira" },
  { value: "PALETEIRA_HIDRAULICA", label: "Paleteira Hidráulica" },
  { value: "PALETEIRA_ELETRICA", label: "Paleteira Elétrica" },
  { value: "CAMINHAO_MUNCK", label: "Caminhão Munck" },
  { value: "CHAPA", label: "Chapa (Ajudante)" },
  { value: "VEICULO", label: "Veículo Leve" },
  { value: "OUTRO", label: "Outro" },
];

const URGENCY = [
  { value: "LOW", label: "Baixa" },
  { value: "MEDIUM", label: "Média" },
  { value: "HIGH", label: "Alta" },
  { value: "URGENT", label: "Urgente" },
];

const STEPS = [
  { label: "Equipamento", icon: Cog },
  { label: "Período", icon: CalendarIcon },
  { label: "Justificativa", icon: ClipboardList },
];

const DIALOG_KEY = 'vpreq_m6';
const LONG_RENTAL_DAYS = 30;

export const Route = createFileRoute("/rental")({
  head: () => ({
    meta: [
      { title: "M6 Locação — VPRequisições" },
      { name: "description", content: "Requisição de locação de equipamentos e veículos" },
    ],
  }),
  component: RentalPage,
});

function RentalPage() {
  const { session, profile, user } = useAuth();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [equipmentName, setEquipmentName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [specs, setSpecs] = useState("");
  const [quantity, setQuantity] = useState("1");

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [deliveryLocation, setDeliveryLocation] = useState("");

  const [urgencyLevel, setUrgencyLevel] = useState("");
  const [justification, setJustification] = useState("");

  const rentalDays = useMemo(() => {
    if (startDate && endDate) return differenceInCalendarDays(endDate, startDate);
    return 0;
  }, [startDate, endDate]);

  const isLongRental = rentalDays > LONG_RENTAL_DAYS;

  const loadTickets = async () => {
    if (!session) return;
    const { data } = await supabaseBrowser
      .from("requisitions")
      .select("ticket_number,title,requester_name,urgency,status,created_at")
      .eq("module", "M6")
      .order("created_at", { ascending: false })
      .limit(20);
    setTickets((data ?? []).map((item) => ({
      id: item.ticket_number,
      title: item.title,
      requester: item.requester_name,
      urgency: item.urgency as TicketRow["urgency"],
      status: item.status as TicketRow["status"],
      date: new Date(item.created_at).toLocaleDateString("pt-BR"),
    })));
  };

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DIALOG_KEY);
      if (!saved) return;
      const s = JSON.parse(saved) as Record<string, unknown>;
      if (!s.open) return;
      setDialogOpen(true);
      if (typeof s.step === 'number') setStep(s.step);
      if (typeof s.equipmentName === 'string') setEquipmentName(s.equipmentName);
      if (Array.isArray(s.categories)) setCategories(s.categories as string[]);
      else if (typeof s.category === 'string' && s.category) setCategories([s.category as string]);
      if (typeof s.specs === 'string') setSpecs(s.specs);
      if (typeof s.quantity === 'string') setQuantity(s.quantity);
      if (typeof s.startDate === 'string') setStartDate(new Date(s.startDate));
      if (typeof s.endDate === 'string') setEndDate(new Date(s.endDate));
      if (typeof s.deliveryLocation === 'string') setDeliveryLocation(s.deliveryLocation);
      if (typeof s.urgencyLevel === 'string') setUrgencyLevel(s.urgencyLevel);
      if (typeof s.justification === 'string') setJustification(s.justification);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void loadTickets(); }, [session]);

  useEffect(() => {
    if (!dialogOpen) return;
    try {
      sessionStorage.setItem(DIALOG_KEY, JSON.stringify({
        open: true, step, equipmentName, categories, specs, quantity,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        deliveryLocation, urgencyLevel, justification,
      }));
    } catch { /* ignore */ }
  }, [dialogOpen, step, equipmentName, categories, specs, quantity,
      startDate, endDate, deliveryLocation, urgencyLevel, justification]);

  const resetForm = () => {
    sessionStorage.removeItem(DIALOG_KEY);
    setStep(0);
    setEquipmentName(""); setCategories([]); setSpecs(""); setQuantity("1");
    setStartDate(undefined); setEndDate(undefined); setDeliveryLocation("");
    setUrgencyLevel(""); setJustification("");
  };

  const validateStep = (): boolean => {
    if (step === 0) {
      if (equipmentName.length < 3) { toast.error("Nome do equipamento deve ter pelo menos 3 caracteres."); return false; }
      if (categories.length === 0) { toast.error("Selecione pelo menos uma categoria."); return false; }
      if (!quantity || parseInt(quantity) <= 0) { toast.error("Quantidade deve ser maior que 0."); return false; }
    }
    if (step === 1) {
      if (!startDate) { toast.error("Informe a data de início."); return false; }
      if (!endDate) { toast.error("Informe a data de término."); return false; }
      if (endDate < startDate) { toast.error("Data de término deve ser igual ou posterior ao início."); return false; }
      if (!deliveryLocation.trim()) { toast.error("Informe o local de entrega."); return false; }
    }
    if (step === 2) {
      if (!urgencyLevel) { toast.error("Selecione o nível de urgência."); return false; }
      if (justification.length < 10) { toast.error("Justificativa deve ter pelo menos 10 caracteres."); return false; }
      if (isLongRental && justification.length < 50) {
        toast.error("Locação acima de 30 dias requer justificativa detalhada (mín. 50 caracteres)."); return false;
      }
    }
    return true;
  };

  const handleNext = () => { if (validateStep()) { toast.dismiss(); setStep((s) => Math.min(s + 1, STEPS.length - 1)); } };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabaseBrowser
        .from("requisitions")
        .insert({
          module: "M6",
          title: `Locação ${equipmentName} — ${rentalDays} dia(s)`,
          description: justification,
          justification,
          urgency: urgencyLevel,
          desired_date: startDate?.toISOString().slice(0, 10) ?? null,
          requester_name: profile?.full_name || user?.email || "Usuário VP",
          requester_email: profile?.email || user?.email || "",
          requester_department: profile?.department || "Não informado",
          requester_profile_id: user?.id ?? null,
          module_data: {
            equipment_name: equipmentName,
            categories,
            category: categories[0] ?? "",
            specs,
            quantity: parseInt(quantity),
            start_date: startDate?.toISOString().slice(0, 10),
            end_date: endDate?.toISOString().slice(0, 10),
            rental_days: rentalDays,
            delivery_location: deliveryLocation,
            long_rental: isLongRental,
          },
        });

      if (error) throw error;

      // SELECT separado para não acionar policy de SELECT durante INSERT
      const { data: created } = await supabaseBrowser
        .from("requisitions")
        .select("id,ticket_number")
        .eq("module", "M6")
        .eq("requester_profile_id", user?.id ?? "")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      toast.success("Requisição de locação criada!", { description: created?.ticket_number ?? "" });
      void notifyVpClickClient({
        stage: "V1",
        requisitionId: created?.id ?? "",
        ticketNumber: created?.ticket_number ?? "",
        title: `Locação ${equipmentName} — ${rentalDays} dia(s)`,
        module: "M6",
        requesterName: profile?.full_name || user?.email || "Usuário VP",
      }).catch(console.warn);
      setDialogOpen(false);
      resetForm();
      await loadTickets();
    } catch (err) {
      toast.error(friendlySupabaseError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
            <Key className="h-5 w-5 text-vp-yellow-dark" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">M6 — Locação</h1>
            <p className="text-sm text-muted-foreground">Equipamentos e veículos temporários</p>
          </div>
        </div>
        <Button variant="vp" onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Nova Requisição
        </Button>
      </div>

      <TicketsTable
        tickets={tickets}
        emptyIcon={<Key className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />}
        emptyMessage="Nenhuma requisição de locação ainda."
      />

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (open) setDialogOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader>
            <DialogTitle>Nova Requisição de Locação</DialogTitle>
            <DialogDescription>Informe o equipamento e período de locação.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              const done = i < step;
              return (
                <button key={s.label} type="button" onClick={() => { if (i < step) setStep(i); }}
                  className={cn("flex flex-col items-center gap-1 text-[10px] font-medium transition-colors flex-1",
                    active ? "text-vp-yellow-dark" : done ? "text-green-600" : "text-muted-foreground")}>
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                    active ? "border-vp-yellow bg-amber-50" : done ? "border-green-500 bg-green-50" : "border-border")}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {s.label}
                </button>
              );
            })}
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome do Equipamento *</label>
                <Input placeholder="Ex.: Andaime Tubular 5m x 2m" value={equipmentName} onChange={(e) => setEquipmentName(e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Categoria * (selecione uma ou mais)</label>
                <div className="grid grid-cols-2 gap-2">
                  {EQUIPMENT_CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() =>
                        setCategories((prev) =>
                          prev.includes(c.value) ? prev.filter((v) => v !== c.value) : [...prev, c.value],
                        )
                      }
                      className={cn(
                        "rounded-lg border-2 p-2.5 text-xs font-medium text-center transition-all",
                        categories.includes(c.value)
                          ? "border-vp-yellow bg-amber-50 text-vp-yellow-dark"
                          : "border-border hover:border-muted-foreground/40",
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Especificações Técnicas</label>
                <Textarea placeholder="Capacidade, potência, dimensões, requisitos especiais..." value={specs} onChange={(e) => setSpecs(e.target.value)} rows={2} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Quantidade *</label>
                <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Data de Início *</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate}
                        disabled={(d) => d < new Date()} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Data de Término *</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate}
                        disabled={(d) => d < (startDate || new Date())} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {startDate && endDate && rentalDays > 0 && (
                <div className={cn(
                  "rounded-lg border p-3 text-sm",
                  isLongRental ? "border-orange-300 bg-orange-50 text-orange-700" : "border-border bg-muted/30 text-muted-foreground"
                )}>
                  {isLongRental ? (
                    <p className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      Locação longa: <strong>{rentalDays} dias</strong> — requer contrato especial e justificativa detalhada
                    </p>
                  ) : (
                    <p>Período: <span className="font-semibold text-foreground">{rentalDays} dia(s)</span></p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Local de Entrega *</label>
                <Input placeholder="Endereço, obra, setor" value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nível de Urgência *</label>
                <div className="grid grid-cols-4 gap-2">
                  {URGENCY.map((u) => (
                    <button key={u.value} type="button" onClick={() => setUrgencyLevel(u.value)}
                      className={cn("rounded-lg border-2 p-2.5 text-xs font-medium text-center transition-all",
                        urgencyLevel === u.value
                          ? u.value === "LOW" ? "border-green-500 bg-green-50 text-green-700"
                          : u.value === "MEDIUM" ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                          : u.value === "HIGH" ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-red-500 bg-red-50 text-red-700"
                          : "border-border hover:border-muted-foreground/40")}>
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Justificativa *
                  {isLongRental && <span className="text-orange-600 ml-1">(mín. 50 caracteres — locação longa)</span>}
                </label>
                <Textarea
                  placeholder={isLongRental
                    ? "Locação longa: justifique a necessidade, alternativas consideradas e aprovação gerencial..."
                    : "Por que a locação é necessária? Alternativas consideradas..."
                  }
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-[11px] text-muted-foreground">{justification.length}/500{isLongRental && " (mín. 50)"}</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={() => step === 0 ? setDialogOpen(false) : setStep(step - 1)}>
              {step === 0 ? "Cancelar" : <><ChevronLeft className="h-4 w-4 mr-1" /> Voltar</>}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="vp" onClick={handleNext}>Próximo <ChevronRight className="h-4 w-4 ml-1" /></Button>
            ) : (
              <Button variant="vp" onClick={() => void handleSubmit()} disabled={isSubmitting}>
                <Key className="h-4 w-4 mr-1" /> {isSubmitting ? "Enviando..." : "Enviar Requisição"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
