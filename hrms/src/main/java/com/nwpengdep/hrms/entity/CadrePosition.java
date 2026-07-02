package com.nwpengdep.hrms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "cadre_positions",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"designation_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CadrePosition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "designation_id", nullable = false)
    private Designation designation;

    private Integer approvedCount;

    @Column(name = "display_order")
    private Integer displayOrder;
}
